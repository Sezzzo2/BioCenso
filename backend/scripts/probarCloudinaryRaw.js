require("dotenv").config();
const crypto = require("crypto");

const cloud = process.env.CLOUDINARY_CLOUD_NAME;
const key = process.env.CLOUDINARY_API_KEY;
const secret = process.env.CLOUDINARY_API_SECRET;

(async () => {
  const timestamp = Math.floor(Date.now() / 1000);
  const firma = crypto
    .createHash("sha1")
    .update(`timestamp=${timestamp}${secret}`)
    .digest("hex");

  const png =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

  const form = new FormData();
  form.append("file", png);
  form.append("api_key", key);
  form.append("timestamp", String(timestamp));
  form.append("signature", firma);

  try {
    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, {
      method: "POST",
      body: form,
    });
    console.log("ESTADO:", res.status);
    console.log("TIPO:", res.headers.get("content-type"));
    console.log("SERVIDOR:", res.headers.get("server"));
    console.log("CUERPO:", (await res.text()).slice(0, 600));
  } catch (e) {
    console.error("ERROR DE RED:", e.message, e.cause?.code || "");
  }
})();