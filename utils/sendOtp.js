import twilio from "twilio";
import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

// --------------------------------------------------
// ENV FLAGS
// --------------------------------------------------
const OTP_TEST_MODE = process.env.OTP_TEST_MODE === "true";

// --------------------------------------------------
// TWILIO CLIENT (only initialized if needed)
// --------------------------------------------------
let client = null;

if (!OTP_TEST_MODE) {
  client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );
}

// --------------------------------------------------
// SEND OTP FUNCTION
// --------------------------------------------------
const sendOtp = async (mobile, otp) => {
  console.log(`[OTP] Mobile: ${mobile}, OTP: ${otp}`);

  // --------------------------------------------------
  // 🟡 TEST MODE → DO NOT SEND SMS
  // --------------------------------------------------
  if (OTP_TEST_MODE) {
    console.log("🟡 OTP_TEST_MODE enabled → Skipping SMS send");
    return true;
  }

  // --------------------------------------------------
  // 🔵 PRODUCTION MODE → TWILIO
  // --------------------------------------------------
  try {
    await client.messages.create({
      body: `Your OTP is ${otp}`,
      from: process.env.TWILIO_FROM_NUMBER || "+16282031962",
      to: `+91${mobile}`,
    });

    console.log("✅ OTP sent via Twilio");
    return true;
  } catch (err) {
    console.error("❌ Twilio Error:", err.message);
    return false;
  }

  // --------------------------------------------------
  // 🔵 ALTERNATIVE: MSG91 (commented)
  // --------------------------------------------------
  /*
  const authKey = process.env.MSG91_AUTH_KEY;
  const templateId = process.env.MSG91_TEMPLATE_ID;
  const senderId = process.env.MSG91_SENDER_ID;
  const url = `https://api.msg91.com/api/v5/otp`;

  try {
    const response = await axios.post(
      url,
      {
        mobile: `+91${mobile}`,
        otp,
        sender: senderId,
        template_id: templateId,
      },
      {
        headers: {
          authkey: authKey,
          "Content-Type": "application/json",
        },
      }
    );

    if (response.data?.type === "success") {
      console.log("✅ MSG91 OTP sent");
      return true;
    }

    console.error("❌ MSG91 response error:", response.data);
    return false;
  } catch (error) {
    console.error(
      "❌ MSG91 OTP Error:",
      error.response?.data || error.message
    );
    return false;
  }
  */
};

export default sendOtp;

