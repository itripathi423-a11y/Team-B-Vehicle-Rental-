import { NextRequest, NextResponse } from "next/server";
import { generateEsewaSignature } from "@/lib/generateEsewaSignature";
import { v4 as uuidv4 } from "uuid";

// POST – initiate eSewa payment
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { amount, productId } = body;

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL!;
  const merchantCode = process.env.NEXT_PUBLIC_ESEWA_MERCHANT_CODE!;
  const secretKey = process.env.ESEWA_SECRET_KEY!;

  const transactionUuid = uuidv4();
  const totalAmount = String(amount);

  const signatureData = `total_amount=${totalAmount},transaction_uuid=${transactionUuid},product_code=${merchantCode}`;
  const signature = generateEsewaSignature(secretKey, signatureData);

  const formHtml = `
    <html>
      <body>
        <form id="esewaForm" action="https://rc-epay.esewa.com.np/api/epay/main/v2/form" method="POST">
          <input type="hidden" name="amount" value="${totalAmount}" />
          <input type="hidden" name="tax_amount" value="0" />
          <input type="hidden" name="total_amount" value="${totalAmount}" />
          <input type="hidden" name="transaction_uuid" value="${transactionUuid}" />
          <input type="hidden" name="product_code" value="${merchantCode}" />
          <input type="hidden" name="product_service_charge" value="0" />
          <input type="hidden" name="product_delivery_charge" value="0" />
          <input type="hidden" name="success_url" value="${baseUrl}/success?gateway=esewa" />
          <input type="hidden" name="failure_url" value="${baseUrl}?payment=failed" />
          <input type="hidden" name="signed_field_names" value="total_amount,transaction_uuid,product_code" />
          <input type="hidden" name="signature" value="${signature}" />
        </form>
        <script>document.getElementById('esewaForm').submit();</script>
      </body>
    </html>
  `;

  return NextResponse.json({ formHtml });
}

// GET – verify eSewa payment
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const encodedData = searchParams.get("data");

  if (!encodedData) {
    return NextResponse.json({ error: "No data provided" }, { status: 400 });
  }

  try {
    const decoded = JSON.parse(Buffer.from(encodedData, "base64").toString("utf-8"));
    const { transaction_uuid, total_amount, status } = decoded;

    if (status !== "COMPLETE") {
      return NextResponse.json({ success: false, status });
    }

    const verifyUrl = process.env.ESEWA_VERIFY_URL!;
    const merchantCode = process.env.NEXT_PUBLIC_ESEWA_MERCHANT_CODE!;

    const verifyRes = await fetch(
      `${verifyUrl}?product_code=${merchantCode}&transaction_uuid=${transaction_uuid}&total_amount=${total_amount}`
    );
    const verifyData = await verifyRes.json();

    return NextResponse.json({ success: verifyData.status === "COMPLETE", data: verifyData });
  } catch (err) {
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
