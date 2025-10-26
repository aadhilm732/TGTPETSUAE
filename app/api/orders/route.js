import prisma from "@/lib/prisma";
import { getAuth, clerkClient } from "@clerk/nextjs/server";
import { PaymentMethod } from "@prisma/client";
import { NextResponse } from "next/server";
import Stripe from "stripe";

export async function POST(request) {
  try {
    const { userId } = await getAuth(request); // ✅ only get userId
    if (!userId) {
      return NextResponse.json({ error: "not authorized" }, { status: 401 });
    }

    // ✅ Safely check if user is a Plus member
    let isPlusMember = false;
    try {
      const user = await clerkClient.users.getUser(userId);
      isPlusMember = user?.publicMetadata?.plan === "plus";
    } catch (err) {
      console.warn("⚠️ Clerk user fetch failed:", err.message);
    }

    const { addressId, items, couponCode, paymentMethod } = await request.json();

    // ✅ Validation
    if (!addressId || !paymentMethod || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Missing order details" }, { status: 400 });
    }

    // ✅ Coupon logic
    let coupon = null;
    if (couponCode) {
      coupon = await prisma.coupon.findUnique({ where: { code: couponCode } });
      if (!coupon) {
        return NextResponse.json({ error: "Coupon not found" }, { status: 400 });
      }
    }

    // ✅ New user check
    if (couponCode && coupon.forNewUser) {
      const userOrders = await prisma.order.findMany({ where: { userId } });
      if (userOrders.length > 0) {
        return NextResponse.json({ error: "Coupon valid for new users only" }, { status: 400 });
      }
    }

    // ✅ Member-only coupon check
    if (couponCode && coupon.forMember && !isPlusMember) {
      return NextResponse.json({ error: "Coupon valid for members only" }, { status: 400 });
    }

    // ✅ Group items by store
    const ordersByStore = new Map();
    for (const item of items) {
      const product = await prisma.product.findUnique({ where: { id: item.id } });
      const storeId = product.storeId;
      if (!ordersByStore.has(storeId)) ordersByStore.set(storeId, []);
      ordersByStore.get(storeId).push({ ...item, price: product.price });
    }

    let orderIds = [];
    let fullAmount = 0;

    // ✅ Create order per store
    for (const [storeId, sellerItems] of ordersByStore.entries()) {
      let total = sellerItems.reduce((acc, item) => acc + item.price * item.quantity, 0);

      if (couponCode) total += 5; // add shipping fee

      fullAmount += parseFloat(total.toFixed(2));

      const order = await prisma.order.create({
        data: {
          userId,
          storeId,
          addressId,
          total: parseFloat(total.toFixed(2)),
          paymentMethod,
          isCouponUsed: !!coupon,
          coupon: coupon ? coupon : {},
          orderItems: {
            create: sellerItems.map(item => ({
              productId: item.id,
              quantity: item.quantity,
              price: item.price
            }))
          }
        }
      });

      orderIds.push(order.id);
    }

    // ✅ Stripe payment
    if (paymentMethod === "STRIPE") {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
      const origin = request.headers.get("origin");

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "aed",
              product_data: { name: "Order" },
              unit_amount: Math.round(fullAmount * 100)
            },
            quantity: 1
          }
        ],
        expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
        mode: "payment",
        success_url: `${origin}/loading?nextUrl=orders`,
        cancel_url: `${origin}/cart`,
        metadata: {
          orderIds: orderIds.join(","),
          userId,
          appId: "TGTPETSUAE"
        }
      });

      return NextResponse.json({ session });
    }

    // ✅ Clear cart
    await prisma.user.update({
      where: { id: userId },
      data: { cart: {} }
    });

    return NextResponse.json({ message: "Order placed successfully" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error.code || error.message }, { status: 400 });
  }
}

// ✅ GET: Fetch all user orders
export async function GET(request) {
  try {
    const { userId } = getAuth(request);
    const orders = await prisma.order.findMany({
      where: {
        userId,
        OR: [
          { paymentMethod: PaymentMethod.COD },
          { AND: [{ paymentMethod: PaymentMethod.STRIPE }, { isPaid: true }] }
        ]
      },
      include: {
        orderItems: { include: { product: true } },
        address: true
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json({ orders });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
