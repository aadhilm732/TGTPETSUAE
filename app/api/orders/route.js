import prisma from "@/lib/prisma";
import { getAuth } from "@clerk/nextjs/server";
import { PaymentMethod } from "@prisma/client";
import { NextResponse } from "next/server";
import Stripe from "stripe";

export async function POST(request) {
  try {
    const { userId, has } = getAuth(request);
    if (!userId) {
      return NextResponse.json({ error: "Not authorized" }, { status: 401 });
    }

    const { addressId, items, couponCode, paymentMethod } = await request.json();

    // ✅ Validate order input
    if (!addressId || !paymentMethod || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Missing order details" }, { status: 400 });
    }

    let coupon = null;

    // ✅ Check coupon validity
    if (couponCode) {
      coupon = await prisma.coupon.findUnique({ where: { code: couponCode } });
      if (!coupon) {
        return NextResponse.json({ error: "Coupon not found" }, { status: 400 });
      }
    }

    // ✅ Check if coupon is for new user
    if (couponCode && coupon.forNewUser) {
      const userOrders = await prisma.order.findMany({ where: { userId } });
      if (userOrders.length > 0) {
        return NextResponse.json({ error: "Coupon valid for new users only" }, { status: 400 });
      }
    }

    const isPlusMember = has({ plan: "plus" });

    // ✅ Check if coupon is for members
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
    let isShippingFeeAdded = false;

    // ✅ Create orders for each store
    for (const [storeId, sellerItems] of ordersByStore.entries()) {
      let total = sellerItems.reduce((acc, item) => acc + item.price * item.quantity, 0);

      if (couponCode) total -= (total * coupon.discount) / 100;
      if (!isPlusMember && !isShippingFeeAdded) {
        total += 5;
        isShippingFeeAdded = true;
      }

      fullAmount += parseFloat(total.toFixed(2));

      const orderData = {
        userId,
        storeId,
        addressId,
        total: parseFloat(total.toFixed(2)),
        paymentMethod,
        isCouponUsed: !!coupon,
        orderItems: {
          create: sellerItems.map((item) => ({
            productId: item.id,
            quantity: item.quantity,
            price: item.price,
          })),
        },
      };

      // ✅ Properly handle coupon relationship
      if (coupon) {
        orderData.coupon = { connect: { id: coupon.id } };
      }

      const order = await prisma.order.create({ data: orderData });
      orderIds.push(order.id);
    }

    // ✅ Stripe payment handling
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
              unit_amount: Math.round(fullAmount * 100),
            },
            quantity: 1,
          },
        ],
        expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
        mode: "payment",
        success_url: `${origin}/loading?nextUrl=orders`,
        cancel_url: `${origin}/cart`,
        metadata: {
          orderIds: orderIds.join(","),
          userId,
          appId: "TGTPETSUAE",
        },
      });

      return NextResponse.json({ session });
    }

    // ✅ Clear user's cart
    await prisma.user.update({
      where: { id: userId },
      data: { cart: {} },
    });

    return NextResponse.json({ message: "Order placed successfully" });
  } catch (error) {
    console.error("POST /orders error:", error);
    return NextResponse.json({ error: error.code || error.message }, { status: 400 });
  }
}

// ✅ GET all orders for a user
export async function GET(request) {
  try {
    const { userId } = getAuth(request);
    if (!userId) {
      return NextResponse.json({ error: "Not authorized" }, { status: 401 });
    }

    const orders = await prisma.order.findMany({
      where: {
        userId,
        OR: [
          { paymentMethod: PaymentMethod.COD },
          { AND: [{ paymentMethod: PaymentMethod.STRIPE }, { isPaid: true }] },
        ],
      },
      include: {
        orderItems: { include: { product: true } },
        address: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // 🪵 Log to inspect returned structure
    console.log("🪵 Orders fetched from DB:\n", JSON.stringify(orders, null, 2));

    return NextResponse.json({ orders });
  } catch (error) {
    console.error("GET /orders error:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
