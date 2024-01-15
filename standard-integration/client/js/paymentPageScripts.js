var year = new Date().getFullYear();
$('#copyright').html("Copyright " + year + " Winni JFO");
function clearFormData() {
    // Check if 'formData' exists in local storage
    if (localStorage.getItem('formData')) {
        // Remove 'formData' from local storage
        localStorage.removeItem('formData');
    }
}
function showError(message) {
    $("#errorMessage").html(message).removeClass("d-none");
}
window.paypal.Buttons({
    async createOrder(data, actions) {
        console.log('in createOrder');
        // Adding the form fields
        var items = [];

        // Define your items and the corresponding input field IDs
        var itemDefinitions = [
            { name: "deposit", inputId: "#txtdeposit" },
            { name: "donation", inputId: "#txtdonation" },
            { name: "registration", inputId: "#txtregistration" },
            { name: "balancedue", inputId: "#txtbalancedue" },
            { name: "fee", inputId: "#fee" }
        ];

        itemDefinitions.forEach(function (itemDef) {
            var value = $(itemDef.inputId).val();
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


        // Now items array contains all your items
        console.log(items);
        var itemTotalValue = 0;

        // Assuming items array is already populated
        items.forEach(function (item) {
            var itemValue = parseFloat(item.unit_amount.value);
            itemTotalValue += itemValue;
        });
        var fullName = $('#campername').val().split(' ');
        var firstName = fullName[0];
        var lastName = fullName.length > 1 ? fullName[fullName.length - 1] : '';

        // Create the payer object
        var payment_source = {
            paypal: {
                name: {
                    given_name: firstName,
                    surname: lastName
                },
                email_address: $('#Email').val(),
                phone: {
                    phone_type: "MOBILE", // Assuming the phone type is mobile; adjust if necessary
                    phone_number: {
                        national_number: $('#phone').val().replace(/\D/g, '') // Remove non-numeric characters
                    }
                }
            }
        };
        var itemTotalValue = 0;

        // Assuming items array is already populated
        items.forEach(function (item) {
            var itemValue = parseFloat(item.unit_amount.value);
            itemTotalValue += itemValue;
        });


        // Create the payer object
        var payment_source = {
            paypal: {
                name: {
                    given_name: firstName,
                    surname: lastName
                },
                email_address: $('#Email').val(),
                phone: {
                    phone_type: "MOBILE", // Assuming the phone type is mobile; adjust if necessary
                    phone_number: {
                        national_number: $('#phone').val().replace(/\D/g, '') // Remove non-numeric characters
                    }
                }
            }
        };

        var order = actions.order.create({
            purchase_units: [{
                amount: {
                    value: $('#txttotalamount').val(),
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
        });
        console.log(order);
        var postData = {
            campername: $('#campername').val(),
            email: $('#Email').val(),
            phone: $('#phone').val(),
            deposit: $('#txtdeposit').val(),
            donation: $('#txtdonation').val(),
            registration: $('#txtregistration').val(),
            balancedue: $('#txtbalancedue').val(),
            totalAmount: $('#txttotalamount').val(),
            threePercent: $('#feeCheckbox').prop('checked'),
            fee: $('#fee').val()
        }
        try {
            const response = await fetch("/api/orders", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                // use the "body" param to optionally pass additional order information
                // like product ids and quantities
                body: JSON.stringify({
                    cart: postData
                }),
            });

            const orderData = await response.json();

            if (orderData.id) {
                return orderData.id;
            } else {
                const errorDetail = orderData?.details?.[0];
                const errorMessage = errorDetail
                    ? `${errorDetail.issue} ${errorDetail.description} (${orderData.debug_id})`
                    : JSON.stringify(orderData);

                throw new Error(errorMessage);
            }
        } catch (error) {
            console.error(error);
            showError(`Could not initiate PayPal Checkout...<br><br>${error}`);
        }
    },

    onApprove: async function (data, actions) {
        console.log('return from order, data: ', data);

        $('#paypal-button-container').hide();
        // $('#spinner').show();



        // Make an AJAX call to your server
        try {
            const response = await fetch(`/api/orders/${data.orderID}/capture`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
            });

            const orderData = await response.json();
            // Three cases to handle:
            //   (1) Recoverable INSTRUMENT_DECLINED -> call actions.restart()
            //   (2) Other non-recoverable errors -> Show a failure message
            //   (3) Successful transaction -> Show confirmation or thank you message

            const errorDetail = orderData?.details?.[0];

            if (errorDetail?.issue === "INSTRUMENT_DECLINED") {
                // (1) Recoverable INSTRUMENT_DECLINED -> call actions.restart()
                // recoverable state, per https://developer.paypal.com/docs/checkout/standard/customize/handle-funding-failures/
                return actions.restart();
            } else if (errorDetail) {
                // (2) Other non-recoverable errors -> Show a failure message
                showError(`${errorDetail.description} (${orderData.debug_id})`);
            } else if (!orderData.purchase_units) {
                throw new Error(JSON.stringify(orderData));
            } else {
                // (3) Successful transaction -> Show confirmation or thank you message
                // Or go to another URL:  actions.redirect('thank_you.html');
                const transaction =
                    orderData?.purchase_units?.[0]?.payments?.captures?.[0] ||
                    orderData?.purchase_units?.[0]?.payments?.authorizations?.[0];
                console.log(
                    `Success! Transaction ${transaction.status}: ${transaction.id}<br><br>See console for all available details`,
                );
                console.log(
                    "Capture result",
                    orderData,
                    JSON.stringify(orderData, null, 2),
                );
                var formData = {
                    // Adding the form fields
                    campername: $('#campername').val(),
                    email: $('#Email').val(),
                    phone: $('#phone').val(),
                    deposit: $('#txtdeposit').val(),
                    donation: $('#txtdonation').val(),
                    registration: $('#txtregistration').val(),
                    balancedue: $('#txtbalancedue').val(),
                    totalAmount: $('#txttotalamount').val(),
                    threePercent: $('#feeCheckbox').prop('checked'),
                    fee: $('#fee').val()
                }
                var dataString = JSON.stringify(formData);

                // Save the stringified data to local storage
                localStorage.setItem('formData', dataString);
                console.log(formData);
                window.location.href = "paymentAcknowledgment.html";
            }
        } catch (error) {
            console.error(error);
            showError(
                `Sorry, your transaction could not be processed...<br><br>${error}`,
            );
        }
    }
}).render('#paypal-button-container');





$(document).ready(function () {
    var regInput = $('#txtregistration');
    var depInput = $('#txtdeposit');
    var donInput = $('#txtdonation');
    var balInput = $('#txtbalancedue');
    var totalInput = $('#txttotalamount');
    var totalPaymentAmount = $('#totalPaymentAmount');

    $('#btnCancel').hide();
    $('#spinner').hide();

    // add a hidden field for the 3% fee in case they pay it
    // Create a hidden input element
    var hiddenInput = document.createElement("input");
    hiddenInput.type = "hidden";
    hiddenInput.name = "fee";
    hiddenInput.id = "fee";  // Optional: set an ID for further reference
    hiddenInput.value = "";  // You can set an initial value if needed
    // Append the hidden input to the form
    var form1 = document.getElementById("form1");
    form1.appendChild(hiddenInput);

    function updateTotal() {
        var regValue = parseFloat(regInput.val()) || 0;
        var depValue = parseFloat(depInput.val()) || 0;
        var donValue = parseFloat(donInput.val()) || 0;
        var balValue = parseFloat(balInput.val()) || 0;

        var total = regValue + depValue + donValue + balValue;
        if ($('#feeCheckbox').prop('checked')) {
            var feeAmount = parseFloat((total * 0.03).toFixed(2));
            total += feeAmount;
            $('#fee').val(feeAmount);
        }
        totalInput.val(total.toFixed(2));
        var formattedTotal = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(total.toFixed(2));
        totalPaymentAmount.text(formattedTotal);
    }

    regInput.on('input', updateTotal);
    depInput.on('input', updateTotal);
    donInput.on('input', updateTotal);
    balInput.on('input', updateTotal);
    $('#feeCheckbox').on('change', updateTotal);

    $('#btnSubmit').on('click', function () {
        let isValid = true;

        let camperNameInput = $('#campername');
        if (!camperNameInput[0].checkValidity()) {
            $('#campernameError').text(camperNameInput.attr('data-error'));
            isValid = false;
        } else {
            $('#campernameError').text('');
        }

        let emailInput = $('#Email');
        if (!emailInput[0].checkValidity()) {
            $('#emailError').text(emailInput.attr('data-error'));
            isValid = false;
        } else {
            $('#emailError').text('');
        }

        let phoneInput = $('.phoneUS');
        if (!phoneInput[0].checkValidity()) {
            $('#phoneError').text(phoneInput.attr('data-error'));
            isValid = false;
        } else {
            $('#phoneError').text('');
        }

        if (isValid) {
            $('#paypal-button-container').show();
            $('#form1').hide();
            $('#btnDirections').hide();
            $('#directions').hide();
            $('#introText').hide();
            $('#btnCancel').show();
            $('#divTotalPayment').show();
        }
    });

    $('#btnCancel').on('click', function () {
        $('#form1').show();
        $('#btnCancel').hide();
        $('#paypal-button-container').hide();
        $('#divTotalPayment').hide();
    });

    $(".phoneUS").inputmask("(999) 999-9999");
});
