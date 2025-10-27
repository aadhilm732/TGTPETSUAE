'use client'
import Image from "next/image";
import { DotIcon } from "lucide-react";
import { useSelector } from "react-redux";
import Rating from "./Rating";
import { useState } from "react";
import RatingModal from "./RatingModal";

const OrderItem = ({ order }) => {
  const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '$';
  const [ratingModal, setRatingModal] = useState(null);
  const { ratings = [] } = useSelector(state => state.rating || {}); // ✅ Default safe fallback

  // ✅ Prevent crash if order or orderItems missing
  if (!order || !order.orderItems?.length) {
    console.warn("⚠️ Order or orderItems missing in OrderItem:", order);
    return (
      <tr>
        <td colSpan={4} className="text-center text-slate-500">
          No order items found
        </td>
      </tr>
    );
  }

  return (
    <>
      <tr className="text-sm">
        <td className="text-left">
          <div className="flex flex-col gap-6">
            {order.orderItems.map((item, index) => {
              const product = item?.product;
              if (!product) {
                console.warn("⚠️ Missing product in order item:", item);
                return null;
              }

              // ✅ Safely find rating (avoid undefined find)
              const existingRating = ratings?.find(
                (rating) =>
                  order.id === rating.orderId &&
                  product.id === rating.productId
              );

              return (
                <div key={index} className="flex items-center gap-4">
                  <div className="w-20 aspect-square bg-slate-100 flex items-center justify-center rounded-md">
                    <Image
                      className="h-14 w-auto"
                      src={product.images?.[0] || "/placeholder.png"}
                      alt="product_img"
                      width={50}
                      height={50}
                    />
                  </div>

                  <div className="flex flex-col justify-center text-sm">
                    <p className="font-medium text-slate-600 text-base">
                      {product.name}
                    </p>
                    <p>
                      {currency}{item.price} Qty: {item.quantity}
                    </p>
                    <p className="mb-1">
                      {new Date(order.createdAt).toDateString()}
                    </p>

                    <div>
                      {existingRating ? (
                        <Rating value={existingRating.rating} />
                      ) : (
                        <button
                          onClick={() =>
                            setRatingModal({
                              orderId: order.id,
                              productId: product.id,
                            })
                          }
                          className={`text-green-500 hover:bg-green-50 transition ${
                            order.status !== "DELIVERED" && "hidden"
                          }`}
                        >
                          Rate Product
                        </button>
                      )}
                    </div>

                    {ratingModal && (
                      <RatingModal
                        ratingModal={ratingModal}
                        setRatingModal={setRatingModal}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </td>

        <td className="text-center max-md:hidden">
          {currency}{order.total}
        </td>

        <td className="text-left max-md:hidden">
          <p>{order.address?.name}, {order.address?.street},</p>
          <p>
            {order.address?.city}, {order.address?.state},{" "}
            {order.address?.zip}, {order.address?.country},
          </p>
          <p>{order.address?.phone}</p>
        </td>

        <td className="text-left space-y-2 text-sm max-md:hidden">
          <div
            className={`flex items-center justify-center gap-1 rounded-full p-1 ${
              order.status === "confirmed"
                ? "text-yellow-500 bg-yellow-100"
                : order.status === "delivered"
                ? "text-green-500 bg-green-100"
                : "text-slate-500 bg-slate-100"
            }`}
          >
            <DotIcon size={10} className="scale-250" />
            {order.status?.split("_").join(" ").toLowerCase()}
          </div>
        </td>
      </tr>

      {/* Mobile */}
      <tr className="md:hidden">
        <td colSpan={5}>
          <p>{order.address?.name}, {order.address?.street}</p>
          <p>
            {order.address?.city}, {order.address?.state},{" "}
            {order.address?.zip}, {order.address?.country}
          </p>
          <p>{order.address?.phone}</p>
          <br />
          <div className="flex items-center">
            <span className="text-center mx-auto px-6 py-1.5 rounded bg-green-100 text-green-700">
              {order.status?.replace(/_/g, " ").toLowerCase()}
            </span>
          </div>
        </td>
      </tr>

      <tr>
        <td colSpan={4}>
          <div className="border-b border-slate-300 w-6/7 mx-auto" />
        </td>
      </tr>
    </>
  );
};

export default OrderItem;
