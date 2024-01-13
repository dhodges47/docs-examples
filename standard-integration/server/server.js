import express from "express";
import fetch from "node-fetch";
import "dotenv/config";
import path from "path";

const { PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PORT = 8888 } = process.env;
//console.log(PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET);
const base = "https://api-m.sandbox.paypal.com";
const app = express();

// host static files
app.use(express.static("client"));

// parse post params sent in body in json format
app.use(express.json());

/**
 * Generate an OAuth 2.0 access token for authenticating with PayPal REST APIs.
 * @see https://developer.paypal.com/api/rest/authentication/
 */
const generateAccessToken = async () => {
  try {
    if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
      throw new Error("MISSING_API_CREDENTIALS");
    }
    const auth = Buffer.from(
      PAYPAL_CLIENT_ID + ":" + PAYPAL_CLIENT_SECRET,
    ).toString("base64");
    const response = await fetch(`${base}/v1/oauth2/token`, {
      method: "POST",
      body: "grant_type=client_credentials",
      headers: {
        Authorization: `Basic ${auth}`,
      },
    });

    const data = await response.json();
    console.log(data);
    console.log('token generated: ', data.access_token)
    return data.access_token;
  } catch (error) {
    console.error("Failed to generate Access Token:", error);
  }
};

/**
 * Create an order to start the transaction.
 * @see https://developer.paypal.com/docs/api/orders/v2/#orders_create
 */
const createOrder = async (cart) => {
  // use the cart information passed from the front-end to calculate the purchase unit details
  console.log(
    "shopping cart information passed from the frontend createOrder() callback:",
    cart,
  );
  const {
    campername,
    email,
    phone,
    deposit,
    donation,
    registration,
    balancedue,
    totalAmount,
    threePercent,
    fee
  } = cart;
  var items = [];

  // Define your items and the corresponding input field IDs
  var itemDefinitions = [
    { name: "deposit", inputId: deposit },
    { name: "donation", inputId: donation },
    { name: "registration", inputId: registration },
    { name: "balancedue", inputId: balancedue },
    { name: "fee", inputId: fee }
  ];

  itemDefinitions.forEach(function (itemDef) {
    var value = itemDef.inputId;
    if (value > 0) {  // Check if the value is greater than zero
      var item = {
        name: itemDef.name,
        quantity: "1", // Assuming quantity is always 1
        unit_amount: {
          value: value,
          currency_code: "USD"
        }
      };
      items.push(item);
    }
  });

  console.log(items);
  var itemTotalValue = 0;
  // Assuming items array is already populated
  items.forEach(function (item) {
    var itemValue = parseFloat(item.unit_amount.value);
    itemTotalValue += itemValue;
  });
  var fullName = campername.split(' ');
  var firstName = fullName[0];
  var lastName = fullName.length > 1 ? fullName[fullName.length - 1] : '';
  // Create the payer object
  var payment_source = {
    paypal: {
      name: {
        given_name: firstName,
        surname: lastName
      },
      email_address: email,
      phone: {
        phone_type: "MOBILE", // Assuming the phone type is mobile; adjust if necessary
        phone_number: {
          national_number: phone.replace(/\D/g, '') // Remove non-numeric characters
        }
      }
    }
  };


  const accessToken = await generateAccessToken();
  const url = `${base}/v2/checkout/orders`;
  const payload = {
    intent: "CAPTURE",
    purchase_units: [{
      amount: {
        value: totalAmount,
        "currency_code": "USD",
        breakdown: {
          item_total: {
            value: itemTotalValue.toFixed(2), // Format to 2 decimal places
            currency_code: "USD"
          }
        }
      },
      items: items

    }],
    payment_source: payment_source,
    application_context: {
      shipping_preference: "NO_SHIPPING"
    }

  };

  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      // Uncomment one of these to force an error for negative testing (in sandbox mode only). Documentation:
      // https://developer.paypal.com/tools/sandbox/negative-testing/request-headers/
      // "PayPal-Mock-Response": '{"mock_application_codes": "MISSING_REQUIRED_PARAMETER"}'
      // "PayPal-Mock-Response": '{"mock_application_codes": "PERMISSION_DENIED"}'
      // "PayPal-Mock-Response": '{"mock_application_codes": "INTERNAL_SERVER_ERROR"}'
    },
    method: "POST",
    body: JSON.stringify(payload),
  });

  return handleResponse(response);
};

/**
 * Capture payment for the created order to complete the transaction.
 * @see https://developer.paypal.com/docs/api/orders/v2/#orders_capture
 */
const captureOrder = async (orderID) => {
  const accessToken = await generateAccessToken();
  const url = `${base}/v2/checkout/orders/${orderID}/capture`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      // Uncomment one of these to force an error for negative testing (in sandbox mode only). Documentation:
      // https://developer.paypal.com/tools/sandbox/negative-testing/request-headers/
      // "PayPal-Mock-Response": '{"mock_application_codes": "INSTRUMENT_DECLINED"}'
      // "PayPal-Mock-Response": '{"mock_application_codes": "TRANSACTION_REFUSED"}'
      // "PayPal-Mock-Response": '{"mock_application_codes": "INTERNAL_SERVER_ERROR"}'
    },
  });

  return handleResponse(response);
};

async function handleResponse(response) {
  try {
    const jsonResponse = await response.json();
    return {
      jsonResponse,
      httpStatusCode: response.status,
    };
  } catch (err) {
    const errorMessage = await response.text();
    throw new Error(errorMessage);


  }
}
app.get("/api/helloworld", async (req, res) => {
  console.log('helloworld');
  const { PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PORT = 8888 } = process.env;
  console.log(PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET);
  return res.status(200).json({ message: "Hello World" })


});
app.post("/api/orders", async (req, res) => {
  try {
    console.log('in /api/order');
    // use the cart information passed from the front-end to calculate the order amount detals
    console.log(req.body);
    const { cart } = req.body;
    console.log('cart', cart)
    const { jsonResponse, httpStatusCode } = await createOrder(cart);
    res.status(httpStatusCode).json(jsonResponse);
  } catch (error) {
    console.error("Failed to create order:", error);
    res.status(500).json({ error: "Failed to create order." });
  }
});

app.post("/api/orders/:orderID/capture", async (req, res) => {
  try {
    const { orderID } = req.params;
    const { jsonResponse, httpStatusCode } = await captureOrder(orderID);
    res.status(httpStatusCode).json(jsonResponse);
  } catch (error) {
    console.error("Failed to create order:", error);
    res.status(500).json({ error: "Failed to capture order." });
  }
});

// serve index.html
app.get("/", (req, res) => {
  res.sendFile(path.resolve("./client/checkout.html"));
});

app.listen(PORT, () => {
  console.log(`Node server listening at http://localhost:${PORT}/`);
});
