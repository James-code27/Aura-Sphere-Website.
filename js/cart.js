(() => {
    const storageKey = 'auraSphereCart';
    const currency = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    });
    const siteRoot = document.body.dataset.siteRoot || '../';
    const appRoot = new URL(siteRoot, document.baseURI);
    const dialog = document.createElement('dialog');
    dialog.className = 'cart-dialog';
    dialog.setAttribute('aria-labelledby', 'cart-title');
    dialog.innerHTML = `
        <div class="cart-panel">
            <header class="cart-header">
                <h1 id="cart-title">Shopping Cart</h1>
                <div class="cart-header-actions">
                    <p data-cart-message role="status" aria-live="polite"></p>
                    <button type="button" class="cart-close" data-cart-close aria-label="Close cart">&times;</button>
                </div>
            </header>
            <div class="cart-layout">
                <section class="cart-products" aria-label="Cart products">
                    <div class="cart-table-head" aria-hidden="true">
                        <span>Products</span>
                        <span>Quantity</span>
                        <span>Total</span>
                        <span>Action</span>
                    </div>
                    <div class="cart-lines" data-cart-lines></div>
                    <p class="cart-empty" data-cart-empty hidden>Your cart is empty. Add something you love.</p>
                    <button type="button" class="cart-clear" data-cart-clear>Clear cart</button>
                </section>
                <aside class="cart-summary" aria-labelledby="cart-summary-title">
                    <h2 id="cart-summary-title">Order Summary</h2>
                    <form class="cart-coupon" data-cart-coupon>
                        <label class="sr-only" for="cart-coupon-code">Coupon code</label>
                        <input id="cart-coupon-code" name="coupon" type="text" maxlength="40" placeholder="Coupon Code" autocomplete="off">
                        <button type="submit">Apply</button>
                    </form>
                    <p class="cart-coupon-message" data-cart-coupon-message role="status" aria-live="polite"></p>
                    <dl class="cart-totals">
                        <div><dt>Subtotal</dt><dd data-cart-subtotal>$0.00</dd></div>
                        <div><dt>Discount</dt><dd data-cart-discount>$0.00</dd></div>
                        <div><dt>Delivery fee</dt><dd data-cart-delivery>$0.00</dd></div>
                        <div class="cart-grand-total"><dt>Total</dt><dd data-cart-total>$0.00</dd></div>
                    </dl>
                    <p class="cart-price-pending" data-cart-price-pending hidden>Some items need prices before checkout can continue.</p>
                    <p class="cart-terms">By proceeding to checkout, you agree to our <a href="${siteRoot}html/about.html">store terms</a>.</p>
                    <button type="button" class="cart-checkout" data-cart-checkout>Proceed to Checkout</button>
                </aside>
            </div>
        </div>`;
    document.body.appendChild(dialog);

    const notification = document.createElement('div');
    notification.className = 'cart-notification';
    notification.setAttribute('role', 'status');
    notification.setAttribute('aria-live', 'polite');
    notification.setAttribute('aria-atomic', 'true');
    notification.innerHTML = `
        <img class="cart-notification-image" data-notification-image alt="">
        <span class="cart-notification-divider" aria-hidden="true"></span>
        <div class="cart-notification-content">
            <div class="cart-notification-title">
                <span class="cart-notification-check" aria-hidden="true"><i class="fa-solid fa-check"></i></span>
                <strong>Product Added!</strong>
            </div>
            <p>The item has been successfully added to your cart! <i class="fa-solid fa-cart-shopping" aria-hidden="true"></i></p>
        </div>
        <button type="button" class="cart-notification-close" aria-label="Dismiss notification">
            <i class="fa-solid fa-xmark" aria-hidden="true"></i>
        </button>`;
    notification.hidden = true;
    document.body.appendChild(notification);
    const notificationImage = notification.querySelector('[data-notification-image]');
    const notificationClose = notification.querySelector('.cart-notification-close');

    const lines = dialog.querySelector('[data-cart-lines]');
    const emptyState = dialog.querySelector('[data-cart-empty]');
    const message = dialog.querySelector('[data-cart-message]');
    const subtotal = dialog.querySelector('[data-cart-subtotal]');
    const discount = dialog.querySelector('[data-cart-discount]');
    const delivery = dialog.querySelector('[data-cart-delivery]');
    const total = dialog.querySelector('[data-cart-total]');
    const pendingPriceNotice = dialog.querySelector('[data-cart-price-pending]');
    const clearButton = dialog.querySelector('[data-cart-clear]');
    const checkoutButton = dialog.querySelector('[data-cart-checkout]');
    const couponForm = dialog.querySelector('[data-cart-coupon]');
    const couponMessage = dialog.querySelector('[data-cart-coupon-message]');
    let lastTrigger = null;
    let storageError = '';
    let notificationTimeout;

    function showAddNotification(image) {
        notificationImage.src = image;
        const nav = document.querySelector('nav');
        const navBottom = nav ? nav.getBoundingClientRect().bottom : 0;
        notification.style.top = `${Math.max(12, navBottom + 12)}px`;
        notification.hidden = false;
        window.clearTimeout(notificationTimeout);
        notificationTimeout = window.setTimeout(() => {
            notification.hidden = true;
        }, 4000);
    }

    function resolveImagePath(image) {
        if (typeof image !== 'string') {
            return null;
        }

        const relativeImage = image.match(/^(?:\.\.\/)*image\/(.+)$/);
        if (relativeImage) {
            return new URL(`image/${relativeImage[1]}`, appRoot).href;
        }

        try {
            const resolvedImage = new URL(image, document.baseURI);
            return resolvedImage.origin === window.location.origin && resolvedImage.pathname.includes('/image/')
                ? resolvedImage.href
                : null;
        } catch (error) {
            return null;
        }
    }

    function isValidItem(item) {
        const validPrice = item && (item.price === null
            || (item.price !== '' && Number.isFinite(Number(item.price)) && Number(item.price) >= 0));
        return item
            && typeof item.id === 'string'
            && typeof item.name === 'string'
            && validPrice
            && resolveImagePath(item.image) !== null
            && Number.isSafeInteger(Number(item.quantity))
            && Number(item.quantity) > 0;
    }

    function loadCart() {
        try {
            const storedCart = window.localStorage.getItem(storageKey);
            if (!storedCart) {
                return [];
            }

            const parsedCart = JSON.parse(storedCart);
            if (!Array.isArray(parsedCart)) {
                throw new TypeError('Stored cart is not a list.');
            }

            const validItems = parsedCart.filter(isValidItem);
            if (validItems.length !== parsedCart.length) {
                storageError = 'Some saved cart items could not be loaded.';
                console.error('Aura Sphere cart contains invalid saved items.');
            }
            return validItems.map(item => ({
                id: item.id,
                name: item.name,
                price: item.price === null ? null : Number(item.price),
                image: resolveImagePath(item.image),
                quantity: Number(item.quantity)
            }));
        } catch (error) {
            storageError = 'Your saved cart could not be read in this browser.';
            console.error('Unable to read the Aura Sphere cart.', error);
            return [];
        }
    }

    let cart = loadCart();

    function setMessage(text, isError) {
        message.textContent = text;
        message.classList.toggle('cart-message-error', Boolean(isError));
    }

    function persistCart() {
        try {
            window.localStorage.setItem(storageKey, JSON.stringify(cart));
            storageError = '';
        } catch (error) {
            storageError = 'Cart changes cannot be saved in this browser.';
            console.error('Unable to save the Aura Sphere cart.', error);
        }
    }

    function getItemCount() {
        return cart.reduce((count, item) => count + item.quantity, 0);
    }

    function createCartLine(item) {
        const row = document.createElement('article');
        row.className = 'cart-line';

        const product = document.createElement('div');
        product.className = 'cart-line-product';

        const image = document.createElement('img');
        image.className = 'cart-line-image';
        image.src = item.image;
        image.alt = item.name;

        const name = document.createElement('h3');
        name.textContent = item.name;
        product.append(image, name);

        const quantity = document.createElement('div');
        quantity.className = 'cart-quantity';
        quantity.setAttribute('aria-label', `Quantity: ${item.quantity}`);

        const decrease = document.createElement('button');
        decrease.type = 'button';
        decrease.dataset.cartAction = 'decrease';
        decrease.dataset.id = item.id;
        decrease.setAttribute('aria-label', `Decrease ${item.name} quantity`);
        decrease.textContent = '-';

        const quantityValue = document.createElement('span');
        quantityValue.textContent = String(item.quantity);

        const increase = document.createElement('button');
        increase.type = 'button';
        increase.dataset.cartAction = 'increase';
        increase.dataset.id = item.id;
        increase.setAttribute('aria-label', `Increase ${item.name} quantity`);
        increase.textContent = '+';
        quantity.append(decrease, quantityValue, increase);

        const lineTotal = document.createElement('strong');
        lineTotal.className = 'cart-line-total';
        lineTotal.textContent = item.price === null
            ? 'Price TBD'
            : currency.format(item.price * item.quantity);

        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'cart-remove';
        remove.dataset.cartAction = 'remove';
        remove.dataset.id = item.id;
        remove.setAttribute('aria-label', `Remove ${item.name} from cart`);
        remove.innerHTML = '<i class="fa-solid fa-trash-can" aria-hidden="true"></i>';

        row.append(product, quantity, lineTotal, remove);
        return row;
    }

    function renderCart() {
        lines.replaceChildren();
        cart.forEach(item => lines.appendChild(createCartLine(item)));

        const count = getItemCount();
        document.querySelectorAll('[data-cart-count]').forEach(badge => {
            badge.textContent = String(count);
            badge.hidden = count === 0;
        });
        document.querySelectorAll('[data-cart-open]').forEach(trigger => {
            trigger.setAttribute('aria-label', `Open shopping cart, ${count} item${count === 1 ? '' : 's'}`);
        });

        const hasUnpricedItems = cart.some(item => item.price === null);
        const subtotalAmount = cart.reduce((sum, item) => sum + (item.price === null ? 0 : item.price * item.quantity), 0);
        const deliveryAmount = cart.length > 0 ? 10 : 0;
        emptyState.hidden = cart.length > 0;
        clearButton.hidden = cart.length === 0;
        pendingPriceNotice.hidden = !hasUnpricedItems;
        subtotal.textContent = hasUnpricedItems ? 'Price TBD' : currency.format(subtotalAmount);
        discount.textContent = currency.format(0);
        delivery.textContent = currency.format(deliveryAmount);
        total.textContent = hasUnpricedItems ? 'Price TBD' : currency.format(subtotalAmount + deliveryAmount);
        checkoutButton.disabled = cart.length === 0 || Boolean(storageError) || hasUnpricedItems;

        if (storageError) {
            setMessage(storageError, true);
        }
    }

    function showCart(trigger) {
        lastTrigger = trigger;
        renderCart();
        if (!dialog.open) {
            dialog.showModal();
        }
        dialog.querySelector('[data-cart-close]').focus();
    }

    function addProduct(button) {
        const { id, name } = button.dataset;
        const image = resolveImagePath(button.dataset.image);
        const price = button.dataset.price === '' ? null : Number(button.dataset.price);
        const quantity = Number(button.dataset.quantity || 1);
        if (!id || !name || !image || (price !== null && (!Number.isFinite(price) || price < 0))
            || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > 99) {
            setMessage('This product cannot be added right now.', true);
            console.error('A product is missing valid cart information.', button);
            showCart(button);
            return;
        }

        const existingItem = cart.find(item => item.id === id);
        if (existingItem) {
            existingItem.quantity += quantity;
            if (existingItem.price === null && price !== null) {
                existingItem.price = price;
            }
        } else {
            cart.push({ id, name, price, image, quantity });
        }

        persistCart();
        renderCart();
        if (!storageError) {
            setMessage(`${name} added to your cart.`, false);
            showAddNotification(image);
            window.dispatchEvent(new CustomEvent('aura:cart-item-added', {
                detail: { id, name, quantity }
            }));
        } else {
            showCart(button);
        }
    }

    notificationClose.addEventListener('click', () => {
        window.clearTimeout(notificationTimeout);
        notification.hidden = true;
    });

    document.addEventListener('click', event => {
        const addButton = event.target.closest('[data-cart-add]');
        if (addButton) {
            event.preventDefault();
            event.stopPropagation();
            addProduct(addButton);
            return;
        }

        const openButton = event.target.closest('[data-cart-open]');
        if (openButton) {
            event.preventDefault();
            showCart(openButton);
        }
    });

    dialog.addEventListener('click', event => {
        if (event.target === dialog) {
            dialog.close();
            return;
        }

        const actionButton = event.target.closest('[data-cart-action]');
        if (!actionButton) {
            return;
        }

        const item = cart.find(cartItem => cartItem.id === actionButton.dataset.id);
        if (!item) {
            return;
        }

        if (actionButton.dataset.cartAction === 'increase') {
            item.quantity += 1;
        } else if (actionButton.dataset.cartAction === 'decrease') {
            item.quantity -= 1;
            if (item.quantity <= 0) {
                cart = cart.filter(cartItem => cartItem.id !== item.id);
            }
        } else if (actionButton.dataset.cartAction === 'remove') {
            cart = cart.filter(cartItem => cartItem.id !== item.id);
        }

        persistCart();
        renderCart();
        if (!storageError) {
            setMessage('Cart updated.', false);
        }
    });

    couponForm.addEventListener('submit', event => {
        event.preventDefault();
        couponMessage.textContent = 'No coupon codes are active right now.';
    });

    dialog.querySelector('[data-cart-close]').addEventListener('click', () => dialog.close());
    clearButton.addEventListener('click', () => {
        cart = [];
        persistCart();
        renderCart();
        if (!storageError) {
            setMessage('Your cart has been cleared.', false);
        }
    });
    checkoutButton.addEventListener('click', () => {
        if (cart.length > 0 && !storageError) {
            setMessage('Checkout is available in the store demo for items already in your cart.', false);
        }
    });
    dialog.addEventListener('close', () => {
        if (lastTrigger && lastTrigger.isConnected) {
            lastTrigger.focus();
        }
    });

    renderCart();
})();
