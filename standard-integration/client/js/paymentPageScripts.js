var year = new Date().getFullYear();
$('#copyright').html("Copyright " + year + " Winni JFO");
function clearFormData() {
    // Check if 'formData' exists in local storage
    if (localStorage.getItem('formData')) {
        // Remove 'formData' from local storage
        localStorage.removeItem('formData');
    }
}

paypal.Buttons({
    createOrder: function (data, actions) {
      
        var order = actions.order.create({
           
            application_context: {
                shipping_preference: "NO_SHIPPING"
            }
        });
        console.log(order);
        return order;
    },
    onApprove: function (data, actions) {
        return actions.order.capture().then(function (details) {
            console.log('return from paypal: ', details);
            // Handle the successful payment

            $('#paypal-button-container').hide();
            $('#spinner').show();

            var postData = {
                transactionID: details?.id ?? null,
                status: details?.status ?? null,
                value: details?.purchase_units?.[0]?.amount?.value ?? null,
                payee_email_address: details?.purchase_units?.[0]?.payee?.email_address ?? null,
                create_time: details?.create_time ?? null,
                payer_name: (details?.payer?.name?.given_name && details?.payer?.name?.surname) ? `${details.payer.name.given_name} ${details.payer.name.surname}` : null,
                payerEmail: details?.payer?.email_address ?? null,

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
            var dataString = JSON.stringify(postData);

            // Save the stringified data to local storage
            localStorage.setItem('formData', dataString);
            console.log(postData);
           // window.location.href = "paymentAcknowledgment.html";
            // Make an AJAX call to your server
            fetch('/api/orders', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    cart: postData
                  }),
            })
                .then((response) => {
                    console.log('Success');
                    console.log(response);
                    window.location.href = "paymentAcknowledgment.html";
                })
                .catch((error) => {
                    console.error('Error:', error);
                });

        });
    },
    onError: function (err) {
        // This function is called if there is an error in the transaction.
        // Here, you can handle declines or other failures.
        console.error('Transaction error:', err);
        // Implement additional logic here, such as displaying a message to the user
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
