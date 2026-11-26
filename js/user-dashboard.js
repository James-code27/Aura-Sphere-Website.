(() => {
    const wishlistKey = 'auraSphereWishlist';
    const wishlistDetailsKey = 'auraSphereWishlistDetails';
    const wishlistCountElements = [...document.querySelectorAll('[data-user-wishlist-count]')];
    const wishlistButtons = [...document.querySelectorAll('[data-user-wishlist-open]')];
    const wishlistError = document.querySelector('[data-user-wishlist-error]');
    const wishlistDialog = document.querySelector('#user-dashboard-wishlist');
    const wishlistItems = wishlistDialog.querySelector('[data-user-wishlist-items]');
    const wishlistEmpty = wishlistDialog.querySelector('[data-user-wishlist-empty]');
    const wishlistMessage = wishlistDialog.querySelector('[data-user-wishlist-message]');
    const wishlistTotal = wishlistDialog.querySelector('[data-user-wishlist-total]');
    const notificationsDialog = document.querySelector('#user-dashboard-notifications');
    const notificationButtons = [...document.querySelectorAll('[data-user-notifications-open]')];
    let wishlistTrigger = null;
    let notificationTrigger = null;

    function readWishlistIds() {
        const ids = JSON.parse(localStorage.getItem(wishlistKey) || '[]');
        if (!Array.isArray(ids) || ids.some(id => typeof id !== 'string')) {
            throw new TypeError('Saved wishlist is not a list of item IDs.');
        }
        return [...new Set(ids)];
    }

    function readWishlistDetails() {
        const details = JSON.parse(localStorage.getItem(wishlistDetailsKey) || '[]');
        if (!Array.isArray(details)) {
            throw new TypeError('Saved wishlist details are not a list.');
        }
        return details.filter(item => item && typeof item.id === 'string');
    }

    function resolveWishlistImage(image) {
        try {
            const url = new URL(image, document.baseURI);
            return url.origin === window.location.origin && url.pathname.includes('/image/')
                ? url.href
                : null;
        } catch (error) {
            return null;
        }
    }

    function updateWishlistCount() {
        try {
            const count = readWishlistIds().length;
            wishlistCountElements.forEach(element => {
                element.textContent = String(count);
                if (element.classList.contains('user-dashboard-icon-count')) {
                    element.hidden = count === 0;
                }
            });
            wishlistButtons.forEach(button => {
                button.setAttribute('aria-label', `Open wishlist, ${count} saved ${count === 1 ? 'item' : 'items'}`);
            });
            wishlistError.hidden = true;
        } catch (error) {
            console.error('Unable to load the customer wishlist count.', error);
            wishlistCountElements.forEach(element => {
                element.textContent = '—';
                if (element.classList.contains('user-dashboard-icon-count')) {
                    element.hidden = true;
                }
            });
            wishlistButtons.forEach(button => button.setAttribute('aria-label', 'Wishlist count unavailable'));
            wishlistError.textContent = 'Your saved item count could not be loaded in this browser.';
            wishlistError.hidden = false;
        }
    }

    function renderWishlist() {
        wishlistItems.replaceChildren();
        wishlistMessage.textContent = '';

        try {
            const ids = readWishlistIds();
            const detailsById = new Map(readWishlistDetails().map(item => [item.id, item]));
            wishlistTotal.textContent = String(ids.length);
            wishlistEmpty.hidden = ids.length > 0;

            ids.forEach(id => {
                const product = detailsById.get(id);
                const row = document.createElement('article');
                row.className = 'user-dashboard-wishlist-item';

                const imageUrl = product && resolveWishlistImage(product.image);
                if (imageUrl) {
                    const image = document.createElement('img');
                    image.src = imageUrl;
                    image.alt = '';
                    image.loading = 'lazy';
                    row.appendChild(image);
                } else {
                    const placeholder = document.createElement('span');
                    placeholder.className = 'user-dashboard-wishlist-placeholder';
                    placeholder.setAttribute('aria-hidden', 'true');
                    placeholder.textContent = '♡';
                    row.appendChild(placeholder);
                }

                const description = document.createElement('div');
                description.className = 'user-dashboard-wishlist-item-details';
                const name = document.createElement('strong');
                name.textContent = product && typeof product.name === 'string'
                    ? product.name
                    : 'Saved item';
                const category = document.createElement('span');
                category.textContent = product && typeof product.category === 'string' && product.category
                    ? product.category
                    : 'Product details unavailable';
                description.append(name, category);
                if (product && product.price !== null && product.price !== undefined
                    && product.price !== '' && Number.isFinite(Number(product.price))) {
                    const price = document.createElement('strong');
                    price.className = 'user-dashboard-wishlist-item-price';
                    price.textContent = new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: 'USD'
                    }).format(Number(product.price));
                    description.appendChild(price);
                }

                const removeButton = document.createElement('button');
                removeButton.className = 'user-dashboard-wishlist-remove';
                removeButton.type = 'button';
                removeButton.dataset.userWishlistRemove = id;
                removeButton.textContent = 'Remove';
                removeButton.setAttribute('aria-label', `Remove ${name.textContent} from wishlist`);
                row.append(description, removeButton);
                wishlistItems.appendChild(row);
            });
        } catch (error) {
            console.error('Unable to render customer wishlist items.', error);
            wishlistTotal.textContent = '—';
            wishlistEmpty.hidden = true;
            wishlistMessage.textContent = 'Saved items could not be loaded. Please try again later.';
        }
    }

    function removeWishlistItem(id) {
        try {
            const ids = readWishlistIds();
            const details = readWishlistDetails();
            localStorage.setItem(wishlistDetailsKey, JSON.stringify(details.filter(item => item.id !== id)));
            localStorage.setItem(wishlistKey, JSON.stringify(ids.filter(savedId => savedId !== id)));
            window.dispatchEvent(new Event('aura:wishlist-updated'));
        } catch (error) {
            console.error('Unable to remove a customer wishlist item.', error);
            wishlistMessage.textContent = 'This item could not be removed. Please try again.';
        }
    }

    document.addEventListener('click', event => {
        const openNotificationsButton = event.target.closest('[data-user-notifications-open]');
        if (openNotificationsButton) {
            notificationTrigger = openNotificationsButton;
            openNotificationsButton.setAttribute('aria-expanded', 'true');
            notificationsDialog.showModal();
            notificationsDialog.querySelector('[data-user-notifications-close]').focus();
            return;
        }

        const openButton = event.target.closest('[data-user-wishlist-open]');
        if (openButton) {
            wishlistTrigger = openButton;
            renderWishlist();
            openButton.setAttribute('aria-expanded', 'true');
            wishlistDialog.showModal();
            wishlistDialog.querySelector('[data-user-wishlist-close]').focus();
            return;
        }

        const removeButton = event.target.closest('[data-user-wishlist-remove]');
        if (removeButton) {
            removeWishlistItem(removeButton.dataset.userWishlistRemove);
        }

        if (event.target.closest('[data-user-notifications-close]')) {
            notificationsDialog.close();
            return;
        }
        if (event.target.closest('[data-user-notification-link]')) {
            notificationsDialog.close();
            return;
        }
        if (event.target.closest('[data-user-wishlist-close]')) {
            wishlistDialog.close();
        }
    });

    notificationsDialog.addEventListener('click', event => {
        if (event.target === notificationsDialog) {
            notificationsDialog.close();
        }
    });
    notificationsDialog.addEventListener('close', () => {
        notificationButtons.forEach(button => button.setAttribute('aria-expanded', 'false'));
        if (notificationTrigger && notificationTrigger.isConnected) {
            notificationTrigger.focus();
        }
    });
    wishlistDialog.addEventListener('click', event => {
        if (event.target === wishlistDialog) {
            wishlistDialog.close();
        }
    });
    wishlistDialog.addEventListener('close', () => {
        wishlistButtons.forEach(button => button.setAttribute('aria-expanded', 'false'));
        if (wishlistTrigger && wishlistTrigger.isConnected) {
            wishlistTrigger.focus();
        }
    });

    window.addEventListener('aura:wishlist-updated', () => {
        updateWishlistCount();
        if (wishlistDialog.open) {
            renderWishlist();
        }
    });
    window.addEventListener('storage', event => {
        if (event.key === wishlistKey || event.key === wishlistDetailsKey) {
            updateWishlistCount();
            if (wishlistDialog.open) {
                renderWishlist();
            }
        }
    });
    document.addEventListener('click', event => {
        const closeButton = event.target.closest('[data-order-details-close]');
        if (!closeButton) {
            return;
        }

        const disclosure = closeButton.closest('.user-order-disclosure');
        if (disclosure) {
            disclosure.open = false;
            disclosure.querySelector('summary').focus();
        }
    });
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            updateWishlistCount();
        }
    });
    updateWishlistCount();
})();
