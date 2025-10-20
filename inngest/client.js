import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "TGTPETSUAE-ecommerce",
  eventKey: process.env.INNGEST_KEY, // ✅ This fixes the 401 error
});
