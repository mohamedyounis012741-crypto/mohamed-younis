let cart = [];

// المنتجات هتتجاب من السيرفر
let products = [];


// =====================================
// تحميل المنتجات من السيرفر
// =====================================

async function loadProducts() {

    try {

        const response = await fetch("/api/products");

        if (!response.ok) {
            throw new Error("فشل تحميل المنتجات");
        }

        products = await response.json();

        displayProducts();

    } catch (error) {

        console.error(error);

        const productsContainer =
            document.getElementById("men");

        productsContainer.innerHTML =
            "<p>حدث خطأ في تحميل المنتجات.</p>";
    }
}


// =====================================
// عرض المنتجات في الموقع
// =====================================

function displayProducts() {

    const productsContainer =
        document.getElementById("men");

    productsContainer.innerHTML = "";

    products.forEach(product => {

        productsContainer.innerHTML += `

            <article class="product-card">

                <img
                    src="${product.image}"
                    alt="${product.name}"
                    onerror="this.src='https://via.placeholder.com/300x300?text=No+Image'"
                >

                <h3>
                    ${product.name}
                </h3>

                <p>
                    السعر: ${product.price} جنيه
                </p>

                <select class="size">

                    <option value="">
                        اختر المقاس
                    </option>

                    <option value="S">S</option>

                    <option value="M">M</option>

                    <option value="L">L</option>

                    <option value="XL">XL</option>

                    <option value="XXL">XXL</option>

                </select>

                <input
                    type="number"
                    class="quantity"
                    value="1"
                    min="1"
                >

                <button
                    type="button"
                    class="add-product"
                    data-id="${product.id}"
                >
                    أضف إلى السلة
                </button>

            </article>

        `;
    });
}


// =====================================
// إضافة منتج إلى السلة
// =====================================

function addToCart(id, size, quantity) {

    const product =
        products.find(p => p.id === id);

    if (!product) return;


    const existing =
        cart.find(
            item =>
                item.id === id &&
                item.size === size
        );


    if (existing) {

        existing.quantity += quantity;

    } else {

        cart.push({

            id: product.id,

            name: product.name,

            price: product.price,

            image: product.image,

            size: size,

            quantity: quantity

        });

    }


    renderCart();
}


// =====================================
// عرض السلة
// =====================================

function renderCart() {

    const cartItems =
        document.getElementById("cartItems");

    const totalElement =
        document.getElementById("total");


    cartItems.innerHTML = "";

    let total = 0;


    if (cart.length === 0) {

        cartItems.innerHTML =
            "<p>السلة فارغة</p>";

    }


    cart.forEach((item, index) => {

        const subtotal =
            item.price * item.quantity;


        total += subtotal;


        cartItems.innerHTML += `

            <div class="cart-item">

                <h3>
                    ${item.name}
                </h3>

                <p>
                    المقاس: ${item.size}
                </p>

                <p>
                    الكمية: ${item.quantity}
                </p>

                <p>
                    السعر: ${subtotal} جنيه
                </p>

                <button
                    onclick="removeFromCart(${index})"
                >
                    حذف
                </button>

            </div>

        `;

    });


    totalElement.textContent =
        total;

}


// =====================================
// حذف منتج من السلة
// =====================================

function removeFromCart(index) {

    cart.splice(index, 1);

    renderCart();

}


// =====================================
// زر إضافة إلى السلة
// =====================================

document.addEventListener("click", function(event) {

    if (
        event.target.classList.contains(
            "add-product"
        )
    ) {

        const id =
            Number(event.target.dataset.id);


        const card =
            event.target.closest(
                ".product-card"
            );


        const size =
            card.querySelector(
                ".size"
            ).value;


        const quantity =
            Number(
                card.querySelector(
                    ".quantity"
                ).value
            );


        if (!size) {

            alert(
                "من فضلك اختر المقاس"
            );

            return;
        }


        if (quantity < 1) {

            alert(
                "الكمية يجب أن تكون 1 أو أكثر"
            );

            return;
        }


        addToCart(
            id,
            size,
            quantity
        );

    }

});


// =====================================
// إرسال الطلب
// =====================================

document
    .getElementById("checkoutForm")
    .addEventListener(
        "submit",
        async function(e) {

            e.preventDefault();


            if (cart.length === 0) {

                alert(
                    "السلة فارغة"
                );

                return;
            }


            const name =
                document
                    .getElementById(
                        "customerName"
                    )
                    .value;


            const phone =
                document
                    .getElementById(
                        "phone"
                    )
                    .value;


            const address =
                document
                    .getElementById(
                        "address"
                    )
                    .value;


            const total =
                cart.reduce(
                    (sum, item) => {

                        return sum +
                            (
                                item.price *
                                item.quantity
                            );

                    },
                    0
                );


            try {

                const response =
                    await fetch(
                        "/api/orders",
                        {

                            method: "POST",

                            headers: {

                                "Content-Type":
                                    "application/json"

                            },

                            body:
                                JSON.stringify({

                                    name:
                                        name,

                                    phone:
                                        phone,

                                    address:
                                        address,

                                    items:
                                        cart,

                                    total:
                                        total

                                })

                        }
                    );


                const data =
                    await response.json();


                if (response.ok) {

                    alert(
                        "تم إرسال الطلب بنجاح ✅"
                    );


                    cart = [];

                    renderCart();


                    document
                        .getElementById(
                            "checkoutForm"
                        )
                        .reset();


                } else {

                    alert(
                        data.message ||
                        "حدث خطأ أثناء إرسال الطلب"
                    );

                }


            } catch (error) {

                console.error(error);

                alert(
                    "تعذر الاتصال بالسيرفر"
                );

            }

        }
    );


// =====================================
// تشغيل الموقع
// =====================================

loadProducts();

renderCart();