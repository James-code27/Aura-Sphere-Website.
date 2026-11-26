(() => {
    const wishlistKey = 'auraSphereWishlist';
    const wishlistDetailsKey = 'auraSphereWishlistDetails';
    const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
    const siteRoot = document.body.dataset.siteRoot || '../';
    const appRoot = new URL(siteRoot, document.baseURI);
    const categoryLabels = {
        clothes: 'Clothes',
        electronics: 'Electronics',
        perfume: 'Perfume',
        fitness: 'Fitness',
        footware: 'Footware',
        accessories: 'Accessories',
        bags: 'Bags',
        'home-decor': 'Home decor'
    };
    let catalogRequest = null;
    let homeProductsRequest = null;
    let searchRequestId = 0;
    let searchDebounceTimer = null;
    let wishlistReadError = '';
    let wishlistTrigger = null;

    const nav = document.querySelector('nav');
    const controls = document.createElement('div');
    controls.className = 'store-nav-controls';

    const search = document.createElement('div');
    search.className = 'store-search';
    const searchToggle = document.createElement('button');
    searchToggle.type = 'button';
    searchToggle.className = 'store-nav-icon store-search-toggle';
    searchToggle.setAttribute('aria-label', 'Open product search');
    searchToggle.setAttribute('aria-expanded', 'false');
    searchToggle.setAttribute('aria-controls', 'store-product-search-form');
    searchToggle.innerHTML = '<i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>';
    const searchForm = document.createElement('form');
    searchForm.className = 'store-search-form';
    searchForm.id = 'store-product-search-form';
    searchForm.setAttribute('role', 'search');
    searchForm.innerHTML = `
        <label class="sr-only" for="store-product-search">Search products</label>
        <input class="store-search-input" id="store-product-search" type="search" placeholder="Search" autocomplete="off">
        <button class="store-search-submit" type="submit" aria-label="Search products">
            <i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
        </button>`;
    searchForm.hidden = true;
    const searchResults = document.createElement('div');
    searchResults.className = 'store-search-results';
    searchResults.setAttribute('role', 'list');
    searchResults.setAttribute('aria-label', 'Product search results');
    searchResults.hidden = true;
    const searchBackdrop = document.createElement('div');
    searchBackdrop.className = 'store-search-backdrop';
    searchBackdrop.setAttribute('aria-hidden', 'true');
    searchBackdrop.hidden = true;
    search.appendChild(searchToggle);
    document.body.append(searchBackdrop, searchForm, searchResults);

    const favoritesButton = document.createElement('button');
    favoritesButton.type = 'button';
    favoritesButton.className = 'store-nav-icon store-wishlist-trigger';
    favoritesButton.dataset.wishlistOpen = '';
    favoritesButton.setAttribute('aria-label', 'Open saved items');
    favoritesButton.innerHTML = `
        <i class="fa-regular fa-heart" aria-hidden="true"></i>
        <span class="cart-count wishlist-count" data-wishlist-count hidden>0</span>`;
    controls.append(search, favoritesButton);

    if (nav) {
        const cartTrigger = nav.querySelector('[data-cart-open]');
        const adminTrigger = null;
        const accountTrigger = null;
        if (cartTrigger) {
            nav.insertBefore(controls, cartTrigger);
            controls.appendChild(cartTrigger);
        } else {
            nav.appendChild(controls);
        }
        [adminTrigger, accountTrigger].forEach(trigger => {
            if (trigger) {
                trigger.classList.add('store-nav-icon-link');
                controls.appendChild(trigger);
            }
        });

        const primaryNavigation = nav.querySelector('ul');
        if (primaryNavigation) {
            primaryNavigation.id = primaryNavigation.id || 'store-primary-navigation';

            const menuToggle = document.createElement('button');
            menuToggle.type = 'button';
            menuToggle.className = 'store-nav-menu-toggle';
            menuToggle.setAttribute('aria-label', 'Open navigation menu');
            menuToggle.setAttribute('aria-expanded', 'false');
            menuToggle.setAttribute('aria-controls', primaryNavigation.id);
            menuToggle.innerHTML = `
                <span aria-hidden="true"></span>
                <span aria-hidden="true"></span>
                <span aria-hidden="true"></span>`;
            nav.insertBefore(menuToggle, controls);

            const categoryDropdown = primaryNavigation.querySelector('.dropdown');
            const categoryToggle = categoryDropdown && categoryDropdown.querySelector('.a');
            const categoryMenu = categoryDropdown && categoryDropdown.querySelector('.menu');
            if (categoryToggle && categoryMenu) {
                categoryMenu.id = categoryMenu.id || 'store-category-menu';
                categoryToggle.setAttribute('role', 'button');
                categoryToggle.setAttribute('tabindex', '0');
                categoryToggle.setAttribute('aria-haspopup', 'true');
                categoryToggle.setAttribute('aria-expanded', 'false');
                categoryToggle.setAttribute('aria-controls', categoryMenu.id);
            }

            const setCategoryMenuOpen = isOpen => {
                if (!categoryDropdown || !categoryToggle) {
                    return;
                }
                categoryDropdown.classList.toggle('open', isOpen);
                categoryToggle.setAttribute('aria-expanded', String(isOpen));
            };
            const setNavigationOpen = isOpen => {
                nav.classList.toggle('store-nav-menu-open', isOpen);
                menuToggle.setAttribute('aria-expanded', String(isOpen));
                menuToggle.setAttribute('aria-label', isOpen ? 'Close navigation menu' : 'Open navigation menu');
                if (!isOpen) {
                    setCategoryMenuOpen(false);
                }
            };

            menuToggle.addEventListener('click', () => {
                setNavigationOpen(!nav.classList.contains('store-nav-menu-open'));
            });
            primaryNavigation.addEventListener('click', event => {
                if (event.target.closest('a')) {
                    setNavigationOpen(false);
                }
            });
            if (categoryToggle && categoryDropdown) {
                const toggleCategoryMenu = event => {
                    if (event.type === 'click' && event.target.closest('a')) {
                        return;
                    }
                    event.preventDefault();
                    setCategoryMenuOpen(!categoryDropdown.classList.contains('open'));
                };
                categoryToggle.addEventListener('click', toggleCategoryMenu);
                categoryToggle.addEventListener('keydown', event => {
                    if (event.key === 'Enter' || event.key === ' ') {
                        toggleCategoryMenu(event);
                    }
                });
            }

            document.addEventListener('click', event => {
                if (!nav.contains(event.target)) {
                    setNavigationOpen(false);
                }
            });
            document.addEventListener('keydown', event => {
                if (event.key === 'Escape' && nav.classList.contains('store-nav-menu-open')) {
                    setNavigationOpen(false);
                    menuToggle.focus();
                }
            });
            window.addEventListener('resize', () => {
                if (window.innerWidth > 760) {
                    setNavigationOpen(false);
                }
            });
        }
    }

    const wishlistDialog = document.createElement('dialog');
    wishlistDialog.className = 'wishlist-dialog';
    wishlistDialog.setAttribute('aria-labelledby', 'wishlist-title');
    wishlistDialog.innerHTML = `
        <div class="wishlist-panel">
            <header class="wishlist-header">
                <h2 id="wishlist-title">Saved items</h2>
                <button type="button" class="wishlist-close" aria-label="Close saved items">&times;</button>
            </header>
            <p class="wishlist-message" data-wishlist-message role="status" aria-live="polite"></p>
            <div class="wishlist-items" data-wishlist-items></div>
            <p class="wishlist-empty" data-wishlist-empty hidden>Your saved items will appear here.</p>
        </div>`;
    document.body.appendChild(wishlistDialog);

    const wishlistItems = wishlistDialog.querySelector('[data-wishlist-items]');
    const wishlistEmpty = wishlistDialog.querySelector('[data-wishlist-empty]');
    const wishlistMessage = wishlistDialog.querySelector('[data-wishlist-message]');

    function readWishlistIds() {
        wishlistReadError = '';
        try {
            const ids = JSON.parse(localStorage.getItem(wishlistKey) || '[]');
            if (!Array.isArray(ids)) {
                throw new TypeError('Saved wishlist is not a list.');
            }
            return [...new Set(ids.filter(id => typeof id === 'string'))];
        } catch (error) {
            wishlistReadError = 'Your saved items could not be read in this browser.';
            console.error('Unable to read the saved wishlist.', error);
            return [];
        }
    }

    function readWishlistDetails() {
        try {
            const details = JSON.parse(localStorage.getItem(wishlistDetailsKey) || '[]');
            if (!Array.isArray(details)) {
                throw new TypeError('Saved wishlist details are not a list.');
            }
            return details.filter(item => item && typeof item.id === 'string'
                && typeof item.name === 'string' && typeof item.image === 'string')
                .map(item => ({
                    id: item.id,
                    name: item.name,
                    category: typeof item.category === 'string' ? item.category : '',
                    image: resolveImage(item.image),
                    price: Number.isFinite(Number(item.price)) && item.price !== null
                        ? Number(item.price)
                        : null,
                    rating: Number.isFinite(Number(item.rating)) && item.rating !== null
                        ? Number(item.rating)
                        : null,
                    reviewCount: Number.isSafeInteger(Number(item.reviewCount)) && item.reviewCount !== null
                        ? Number(item.reviewCount)
                        : null
                }));
        } catch (error) {
            console.error('Unable to read saved wishlist product details.', error);
            return [];
        }
    }

    function resolveImage(image) {
        try {
            const url = new URL(image, document.baseURI);
            return url.origin === window.location.origin && url.pathname.includes('/image/')
                ? url.href
                : null;
        } catch (error) {
            return null;
        }
    }

    const productDetailsDialog = document.createElement('dialog');
    productDetailsDialog.className = 'product-details-dialog';
    productDetailsDialog.setAttribute('aria-labelledby', 'product-details-title');
    productDetailsDialog.innerHTML = `
        <article class="product-details-panel">
            <div class="product-details-media">
                <button class="product-details-close" type="button" data-details-close aria-label="Close product details">
                    <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
                        <path d="M6 6l12 12M18 6L6 18"></path>
                    </svg>
                </button>
                <button class="product-details-favorite" type="button" data-details-favorite aria-label="Add item to saved items" aria-pressed="false">
                    <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78Z"></path>
                    </svg>
                </button>
                <span class="product-details-availability" data-details-availability></span>
                <img data-details-image alt="">
            </div>
            <section class="product-details-content">
                <p class="product-details-category" data-details-category></p>
                <h2 id="product-details-title" data-details-name></h2>
                <div class="product-details-rating" data-details-rating hidden>
                    <span class="product-details-stars" aria-hidden="true">★★★★★</span>
                    <span data-details-rating-label></span>
                </div>
                <p class="product-details-price" data-details-price></p>
                <p class="product-details-description" data-details-description></p>
                <div class="product-details-quantity">
                    <label for="product-details-quantity">Quantity</label>
                    <div class="product-details-quantity-control">
                        <button type="button" data-quantity-action="decrease" aria-label="Decrease quantity">−</button>
                        <input id="product-details-quantity" type="number" min="1" max="99" value="1" inputmode="numeric">
                        <button type="button" data-quantity-action="increase" aria-label="Increase quantity">+</button>
                    </div>
                </div>
                <button class="product-details-add" type="button" data-details-add>
                    <i class="fa-solid fa-cart-shopping" aria-hidden="true"></i>
                    <span>Add to Cart</span>
                </button>
                <p class="product-details-status" data-details-status role="status" aria-live="polite"></p>
                <div class="product-details-benefits" aria-label="Shopping information">
                    <span><i class="fa-solid fa-lock" aria-hidden="true"></i> Secure checkout</span>
                    <span><i class="fa-solid fa-box" aria-hidden="true"></i> Easy ordering</span>
                    <span><i class="fa-solid fa-headset" aria-hidden="true"></i> Customer support</span>
                </div>
            </section>
        </article>`;
    document.body.appendChild(productDetailsDialog);

    const detailImage = productDetailsDialog.querySelector('[data-details-image]');
    const detailAvailability = productDetailsDialog.querySelector('[data-details-availability]');
    const detailFavoriteButton = productDetailsDialog.querySelector('[data-details-favorite]');
    const detailCategory = productDetailsDialog.querySelector('[data-details-category]');
    const detailName = productDetailsDialog.querySelector('[data-details-name]');
    const detailRating = productDetailsDialog.querySelector('[data-details-rating]');
    const detailRatingLabel = productDetailsDialog.querySelector('[data-details-rating-label]');
    const detailPrice = productDetailsDialog.querySelector('[data-details-price]');
    const detailDescription = productDetailsDialog.querySelector('[data-details-description]');
    const detailQuantity = productDetailsDialog.querySelector('#product-details-quantity');
    const detailAddButton = productDetailsDialog.querySelector('[data-details-add]');
    const detailStatus = productDetailsDialog.querySelector('[data-details-status]');
    let productDetailsTrigger = null;

    const categoryDescriptionDetails = {
        clothes: 'Its style can complement a range of everyday outfits.',
        electronics: 'It is selected for practical use in everyday routines.',
        perfume: 'It can be considered alongside other personal fragrance selections.',
        fitness: 'It can complement active routines and everyday use.',
        footware: 'It can complement a range of everyday outfits.',
        accessories: 'It can be paired with everyday essentials and personal style.',
        bags: 'It can accompany daily routines and on-the-go essentials.',
        'home-decor': 'It can bring a decorative accent to a living space.',
        'new-arrival': 'It is included among the latest additions to our collection.',
        featured: 'It is featured in the Aura Sphere collection.'
    };
    const categoryAliases = {
        apparel: 'clothes',
        audio: 'electronics',
        footwear: 'footware',
        'home decor': 'home-decor',
        'new arrival': 'new-arrival'
    };

    function normalizeCategory(category) {
        const key = String(category || '').trim().toLowerCase().replace(/[-_]+/g, ' ');
        return categoryAliases[key] || key.replace(/\s+/g, '-');
    }

    function buildProductDescription(name, categoryId, description) {
        const category = categoryLabels[categoryId]
            || (categoryId === 'new-arrival' ? 'New arrival' : 'Aura Sphere');
        const categoryDetail = categoryDescriptionDetails[categoryId] || categoryDescriptionDetails.featured;
        const existingSentences = String(description || '').trim()
            .match(/[^.!?]+[.!?]+(?:\s+|$)|[^.!?]+$/g) || [];
        const sentences = existingSentences
            .map(sentence => sentence.trim().replace(/[.!?]+$/, ''))
            .filter(Boolean);

        sentences.push(
            `The ${name} is part of our ${category} collection`,
            categoryDetail.replace(/[.!?]+$/, ''),
            'Check the listing for item details and current price before ordering'
        );

        return sentences.slice(0, 3).map(sentence => `${sentence}.`).join(' ');
    }

    function setProductDetailsStatus(message, isError = false) {
        detailStatus.textContent = message;
        detailStatus.classList.toggle('is-error', isError);
    }

    function updateDetailsFavoriteButton(isSaved, name) {
        detailFavoriteButton.classList.toggle('is-saved', isSaved);
        detailFavoriteButton.setAttribute('aria-pressed', String(isSaved));
        detailFavoriteButton.setAttribute(
            'aria-label',
            `${isSaved ? 'Remove' : 'Add'} ${name} ${isSaved ? 'from' : 'to'} saved items`
        );
    }

    function syncDetailsFavoriteButton() {
        if (!productDetailsTrigger) {
            return;
        }

        const { dataset } = productDetailsTrigger;
        updateDetailsFavoriteButton(readWishlistIds().includes(dataset.productId), dataset.productName);
    }

    function toggleDetailsFavorite() {
        if (!productDetailsTrigger) {
            return;
        }

        const { dataset } = productDetailsTrigger;
        if (!dataset.productId || !dataset.productName || !dataset.productImage) {
            console.error('Unable to save product because product information is incomplete.', productDetailsTrigger);
            setProductDetailsStatus('This item could not be saved. Please try again.', true);
            return;
        }

        try {
            const storedIds = JSON.parse(localStorage.getItem(wishlistKey) || '[]');
            const storedDetails = JSON.parse(localStorage.getItem(wishlistDetailsKey) || '[]');
            if (!Array.isArray(storedIds) || !Array.isArray(storedDetails)) {
                throw new TypeError('Saved wishlist data is not a list.');
            }

            const isSaved = storedIds.includes(dataset.productId);
            const nextIds = isSaved
                ? storedIds.filter(id => id !== dataset.productId)
                : [...new Set([...storedIds, dataset.productId])];
            const nextDetails = storedDetails.filter(item => item && item.id !== dataset.productId);
            if (!isSaved) {
                const price = Number(dataset.productPrice);
                const rating = Number(dataset.productRating);
                const reviewCount = Number(dataset.productReviewCount);
                nextDetails.push({
                    id: dataset.productId,
                    name: dataset.productName,
                    category: dataset.productCategory || 'Featured',
                    image: dataset.productImage,
                    price: dataset.productPrice !== '' && Number.isFinite(price) ? price : null,
                    rating: dataset.productRating !== '' && Number.isFinite(rating) ? rating : null,
                    reviewCount: dataset.productReviewCount !== '' && Number.isSafeInteger(reviewCount)
                        ? reviewCount
                        : null
                });
            }

            localStorage.setItem(wishlistDetailsKey, JSON.stringify(nextDetails));
            localStorage.setItem(wishlistKey, JSON.stringify(nextIds));
            updateDetailsFavoriteButton(!isSaved, dataset.productName);
            setProductDetailsStatus(
                isSaved ? 'Removed from saved items.' : 'Added to saved items.'
            );
            window.dispatchEvent(new Event('aura:wishlist-updated'));
        } catch (error) {
            console.error('Unable to update saved product details.', error);
            setProductDetailsStatus('This item could not be saved. Please try again.', true);
        }
    }

    function makeProductImageInteractive(image, product) {
        const price = product.price === null || product.price === undefined || product.price === ''
            ? null
            : Number(product.price);
        image.dataset.productDetailsTrigger = '';
        image.dataset.productId = String(product.id || '');
        image.dataset.productName = product.name || image.alt || 'Product';
        image.dataset.productCategory = product.categoryLabel || product.category || 'Featured';
        image.dataset.productCategoryId = normalizeCategory(product.categoryId || product.category);
        image.dataset.productImage = product.image || image.src;
        image.dataset.productPrice = Number.isFinite(price) && price >= 0 ? String(price) : '';
        image.dataset.productAvailable = String(Boolean(product.available) && Number.isFinite(price));
        image.dataset.productCartEnabled = String(product.cartEnabled === true);
        image.dataset.productDescription = product.description || '';
        image.dataset.productRating = product.rating === null || product.rating === undefined ? '' : String(product.rating);
        image.dataset.productReviewCount = product.reviewCount === null || product.reviewCount === undefined
            ? ''
            : String(product.reviewCount);
        image.tabIndex = 0;
        image.setAttribute('role', 'button');
        image.setAttribute('aria-label', `View details for ${image.dataset.productName}`);
        if (!image.alt) {
            image.alt = image.dataset.productName;
        }
    }

    function enhanceHomeProductImages() {
        const imageSelector = [
            '.hero-product-card > img',
            'img[class^="new-tab"][class$="img"]',
            '.sell-tabs1-1 > img',
            '.sell-tabs2-1 > img',
            '.sell-tabs3-1 > img'
        ].join(', ');
        document.querySelectorAll(imageSelector).forEach(image => {
            const card = image.closest('.hero-product-card, .new-tab1, .new-tab2, .new-tab3, .new-tab4, .new-tab5, .new-tab6, .sell-tabs1, .sell-tabs2, .sell-tabs3');
            const addButton = card && card.querySelector('[data-cart-add]');
            if (!addButton) {
                return;
            }

            const isFeatured = card.classList.contains('hero-product-card');
            const isNewArrival = card.classList.contains('new-tab1')
                || card.classList.contains('new-tab2')
                || card.classList.contains('new-tab3')
                || card.classList.contains('new-tab4')
                || card.classList.contains('new-tab5')
                || card.classList.contains('new-tab6');
            const imageUrl = new URL(addButton.dataset.image, document.baseURI);
            const imageParts = imageUrl.pathname.split('/').filter(Boolean);
            const imageFolder = decodeURIComponent(imageParts[imageParts.indexOf('image') + 1] || '');
            const categoryId = isNewArrival ? 'new-arrival' : normalizeCategory(imageFolder);
            const category = isFeatured
                ? card.querySelector('.hero-product-category')?.textContent.trim() || 'Featured'
                : isNewArrival ? 'New Arrival' : categoryLabels[categoryId] || 'Featured';
            const description = card.querySelector('.sell-tabs1-2 > p, .sell-tabs2-2 > p, .sell-tabs3-2 > p');
            makeProductImageInteractive(image, {
                id: addButton.dataset.id,
                name: addButton.dataset.name,
                category,
                categoryId,
                categoryLabel: category,
                image: addButton.dataset.image,
                price: addButton.dataset.price,
                description: description ? description.textContent.trim() : '',
                available: !addButton.disabled
            });
        });
    }

    function updateDetailsQuantity() {
        const quantity = Number(detailQuantity.value);
        const safeQuantity = Number.isSafeInteger(quantity) ? Math.min(99, Math.max(1, quantity)) : 1;
        detailQuantity.value = String(safeQuantity);
        productDetailsDialog.querySelector('[data-quantity-action="decrease"]').disabled = safeQuantity <= 1;
        productDetailsDialog.querySelector('[data-quantity-action="increase"]').disabled = safeQuantity >= 99;
        detailAddButton.dataset.quantity = String(safeQuantity);
    }

    function syncProductDetailsFromCard(image) {
        const card = image.closest('.catalog-product-card, .hero-product-card, .new-tab1, .new-tab2, .new-tab3, .new-tab4, .new-tab5, .new-tab6, .sell-tabs1, .sell-tabs2, .sell-tabs3');
        const addButton = card && card.querySelector('[data-cart-add]');
        if (!addButton) {
            return;
        }

        image.dataset.productId = addButton.dataset.id || image.dataset.productId;
        image.dataset.productName = addButton.dataset.name || image.dataset.productName;
        image.dataset.productImage = addButton.dataset.image || image.dataset.productImage;
        image.dataset.productPrice = addButton.dataset.price || '';
        image.dataset.productAvailable = String(
            !addButton.disabled
            && Boolean(addButton.dataset.id)
            && Number.isFinite(Number(addButton.dataset.price))
            && addButton.dataset.price !== ''
        );
        const description = card.querySelector('.sell-tabs1-2 > p, .sell-tabs2-2 > p, .sell-tabs3-2 > p');
        if (description) {
            image.dataset.productDescription = description.textContent.trim();
        }
    }

    function openProductDetails(image) {
        syncProductDetailsFromCard(image);
        const { dataset } = image;
        const name = dataset.productName;
        const productImage = resolveImage(dataset.productImage || image.src);
        const price = dataset.productPrice === '' ? null : Number(dataset.productPrice);
        const hasPrice = price !== null && Number.isFinite(price) && price >= 0;
        const available = Boolean(dataset.productId)
            && ((dataset.productAvailable === 'true' && hasPrice)
                || dataset.productCartEnabled === 'true');
        const pricePending = available && !hasPrice;
        if (!name || !productImage) {
            console.error('Unable to open product details because product information is incomplete.', image);
            return;
        }

        productDetailsTrigger = image;
        detailImage.src = productImage;
        detailImage.alt = name;
        detailAvailability.textContent = pricePending
            ? 'Price pending'
            : available ? 'Available to order' : 'Price unavailable';
        detailAvailability.classList.toggle('is-unavailable', !available);
        detailCategory.textContent = dataset.productCategory || 'Featured';
        detailName.textContent = name;
        detailPrice.textContent = hasPrice
            ? currency.format(price)
            : 'Price not set yet';
        detailDescription.textContent = buildProductDescription(
            name,
            dataset.productCategoryId,
            dataset.productDescription
        );
        syncDetailsFavoriteButton();

        const rating = Number(dataset.productRating);
        const reviewCount = Number(dataset.productReviewCount);
        const hasRating = dataset.productRating !== '' && Number.isFinite(rating) && rating >= 0 && rating <= 5;
        detailRating.hidden = !hasRating;
        if (hasRating) {
            detailRatingLabel.textContent = Number.isSafeInteger(reviewCount) && reviewCount > 0
                ? `${rating.toFixed(1)} (${reviewCount.toLocaleString()} Reviews)`
                : `${rating.toFixed(1)} out of 5`;
        }

        detailQuantity.value = '1';
        setProductDetailsStatus('');
        detailAddButton.disabled = !available;
        detailAddButton.querySelector('span').textContent = available ? 'Add to Cart' : 'Price unavailable';
        if (available) {
            detailAddButton.dataset.cartAdd = '';
            detailAddButton.dataset.id = dataset.productId;
            detailAddButton.dataset.name = name;
            detailAddButton.dataset.price = hasPrice ? String(price) : '';
            detailAddButton.dataset.image = productImage;
        } else {
            delete detailAddButton.dataset.cartAdd;
            delete detailAddButton.dataset.id;
            delete detailAddButton.dataset.name;
            delete detailAddButton.dataset.price;
            delete detailAddButton.dataset.image;
        }
        updateDetailsQuantity();

        if (!productDetailsDialog.open) {
            productDetailsDialog.showModal();
        }
        productDetailsDialog.querySelector('[data-details-close]').focus();
    }

    enhanceHomeProductImages();

    productDetailsDialog.addEventListener('click', event => {
        if (event.target === productDetailsDialog) {
            productDetailsDialog.close();
            return;
        }

        const quantityButton = event.target.closest('[data-quantity-action]');
        if (quantityButton) {
            const adjustment = quantityButton.dataset.quantityAction === 'increase' ? 1 : -1;
            detailQuantity.value = String(Number(detailQuantity.value || 1) + adjustment);
            updateDetailsQuantity();
        }
    });
    productDetailsDialog.querySelector('[data-details-close]').addEventListener('click', () => {
        productDetailsDialog.close();
    });
    detailFavoriteButton.addEventListener('click', toggleDetailsFavorite);
    detailQuantity.addEventListener('change', updateDetailsQuantity);
    detailQuantity.addEventListener('input', () => {
        if (detailQuantity.value !== '') {
            updateDetailsQuantity();
        }
    });
    document.addEventListener('click', event => {
        const image = event.target.closest('[data-product-details-trigger]');
        if (image) {
            event.preventDefault();
            openProductDetails(image);
        }
    });
    document.addEventListener('keydown', event => {
        if (event.key !== 'Enter' && event.key !== ' ') {
            return;
        }
        const image = event.target.closest('[data-product-details-trigger]');
        if (image) {
            event.preventDefault();
            openProductDetails(image);
        }
    });
    productDetailsDialog.addEventListener('close', () => {
        if (productDetailsTrigger && productDetailsTrigger.isConnected) {
            productDetailsTrigger.focus();
        }
    });
    window.addEventListener('aura:cart-item-added', event => {
        if (productDetailsDialog.open && event.detail.id === detailAddButton.dataset.id) {
            setProductDetailsStatus(`${event.detail.quantity} ${event.detail.quantity === 1 ? 'item' : 'items'} added to your cart.`);
        }
    });

    function updateWishlistCount() {
        const count = readWishlistIds().length;
        const badge = favoritesButton.querySelector('[data-wishlist-count]');
        badge.textContent = String(count);
        badge.hidden = count === 0;
        favoritesButton.setAttribute('aria-label', `Open saved items, ${count} item${count === 1 ? '' : 's'}`);
    }

    function loadCatalogProducts() {
        if (!catalogRequest) {
            if (!Array.isArray(window.auraCatalogProducts)) {
                throw new Error('The product catalog is unavailable.');
            }
            catalogRequest = Promise.resolve(window.auraCatalogProducts.map(product => ({
                ...product,
                image: new URL(product.image, document.baseURI).href
            })));
        }
        return catalogRequest;
    }

    function loadHomeProducts() {
        if (!homeProductsRequest) {
            const homeUrl = new URL('index.html', appRoot);
            homeProductsRequest = fetch(homeUrl)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`Home product request failed with status ${response.status}.`);
                    }
                    return response.text();
                })
                .then(markup => {
                    const homeDocument = new DOMParser().parseFromString(markup, 'text/html');
                    return [...homeDocument.querySelectorAll('[data-cart-add]')].flatMap(button => {
                        const { id, name, image } = button.dataset;
                        const price = Number(button.dataset.price);
                        if (!id || !name || !image || !Number.isFinite(price) || price < 0) {
                            return [];
                        }

                        const imageUrl = new URL(image, homeUrl);
                        const pathParts = imageUrl.pathname.split('/').filter(Boolean);
                        const imageFolder = decodeURIComponent(pathParts[pathParts.indexOf('image') + 1] || '');
                        const category = imageFolder === 'home decor' ? 'home-decor' : imageFolder;
                        const isKnownCategory = Boolean(categoryLabels[category]) || category === 'new-arrival';
                        const card = button.closest('.sell-tabs1, .sell-tabs2, .sell-tabs3');
                        const description = card
                            && card.querySelector('.sell-tabs1-2 > p, .sell-tabs2-2 > p, .sell-tabs3-2 > p');
                        return [{
                            id,
                            name,
                            category: isKnownCategory ? category : '',
                            categoryLabel: categoryLabels[category] || (category === 'new-arrival' ? 'New arrival' : 'Featured'),
                            image: imageUrl.href,
                            price,
                            description: description ? description.textContent.trim() : '',
                            homeAnchor: imageFolder === 'new-arrival' ? '#new' : '#best',
                            searchTerms: decodeURIComponent(imageUrl.pathname.split('/').pop()).replace(/[-_.]+/g, ' ')
                        }];
                    });
                })
                .catch(error => {
                    homeProductsRequest = null;
                    throw error;
                });
        }
        return homeProductsRequest;
    }

    function makeMessage(text, className) {
        const message = document.createElement('p');
        message.className = className;
        message.textContent = text;
        return message;
    }

    function normalizeSearchText(value) {
        return String(value || '')
            .normalize('NFKD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLocaleLowerCase()
            .replace(/[^a-z0-9]+/g, ' ')
            .trim();
    }

    function renderSearchResults(products) {
        searchResults.replaceChildren();
        if (!products.length) {
            searchResults.appendChild(makeMessage('No products found.', 'store-search-empty'));
            searchResults.hidden = false;
            return;
        }

        const savedIds = new Set(readWishlistIds());
        products.forEach(product => {
            const price = Number(product.price);
            const hasPrice = product.price !== null
                && product.price !== undefined
                && Number.isFinite(price)
                && price >= 0;
            const isSaved = savedIds.has(product.id);
            const card = document.createElement('article');
            card.className = 'catalog-product-card store-search-card';
            card.setAttribute('role', 'listitem');

            const visual = document.createElement('div');
            visual.className = 'catalog-product-visual';
            const image = document.createElement('img');
            image.src = product.image;
            image.alt = product.name;
            image.loading = 'lazy';
            makeProductImageInteractive(image, {
                ...product,
                available: hasPrice
            });
            visual.appendChild(image);

            const badge = document.createElement('span');
            badge.className = 'catalog-product-badge';
            badge.textContent = 'New';
            visual.appendChild(badge);

            const favorite = document.createElement('button');
            favorite.type = 'button';
            favorite.className = 'catalog-favorite';
            favorite.dataset.wishlistToggle = '';
            favorite.dataset.id = product.id;
            favorite.dataset.productName = product.name;
            favorite.dataset.category = product.categoryLabel || product.category || '';
            favorite.dataset.categoryId = product.category || '';
            favorite.dataset.image = product.image;
            favorite.dataset.price = hasPrice ? String(price) : '';
            favorite.dataset.rating = product.rating === null || product.rating === undefined
                ? ''
                : String(product.rating);
            favorite.dataset.reviewCount = product.reviewCount === null || product.reviewCount === undefined
                ? ''
                : String(product.reviewCount);
            favorite.setAttribute('aria-pressed', String(isSaved));
            favorite.setAttribute('aria-label', `${isSaved ? 'Remove' : 'Add'} ${product.name} ${isSaved ? 'from' : 'to'} favorites`);
            favorite.innerHTML = `<i class="${isSaved ? 'fa-solid' : 'fa-regular'} fa-heart" aria-hidden="true"></i>`;
            favorite.addEventListener('click', event => {
                event.stopPropagation();
                toggleSearchFavorite(favorite);
            });
            visual.appendChild(favorite);

            const details = document.createElement('div');
            details.className = 'catalog-product-details';
            const name = document.createElement('h3');
            const productLink = document.createElement('a');
            productLink.className = 'store-search-product-link';
            productLink.href = categoryLabels[product.category]
                ? new URL(`html/${product.category}.html`, appRoot).href
                : new URL(`index.html${product.homeAnchor || '#best'}`, appRoot).href;
            productLink.textContent = product.name;
            productLink.addEventListener('click', () => setSearchOpen(false));
            name.appendChild(productLink);
            details.appendChild(name);

            const priceLabel = document.createElement('p');
            priceLabel.className = `catalog-product-price${hasPrice ? '' : ' is-pending'}`;
            priceLabel.textContent = hasPrice ? currency.format(price) : 'Price TBD';
            details.appendChild(priceLabel);

            const ratingStars = document.createElement('span');
            ratingStars.className = 'catalog-product-rating';
            ratingStars.setAttribute('role', 'img');
            ratingStars.setAttribute('aria-label', '5 out of 5 stars');
            ratingStars.textContent = '★★★★★';
            details.appendChild(ratingStars);

            const actions = document.createElement('div');
            actions.className = 'catalog-product-actions';

            const addButton = document.createElement('button');
            addButton.type = 'button';
            addButton.className = 'catalog-cart-button';
            const canAddToCart = Boolean(product.id && product.image);
            if (canAddToCart) {
                addButton.dataset.cartAdd = '';
            }
            addButton.dataset.id = product.id || '';
            addButton.dataset.name = product.name;
            addButton.dataset.price = hasPrice ? String(price) : '';
            addButton.dataset.image = product.image;
            addButton.setAttribute('aria-label', `Add ${product.name} to cart`);
            addButton.innerHTML = '<i class="fa-solid fa-cart-shopping" aria-hidden="true"></i>';
            addButton.disabled = !canAddToCart;
            actions.appendChild(addButton);

            details.appendChild(actions);
            card.append(visual, details);
            searchResults.appendChild(card);
        });
        searchResults.hidden = false;
    }

    function updateSearchFavoriteButtons() {
        const savedIds = new Set(readWishlistIds());
        searchResults.querySelectorAll('.catalog-favorite').forEach(button => {
            const isSaved = savedIds.has(button.dataset.id);
            button.setAttribute('aria-pressed', String(isSaved));
            button.setAttribute('aria-label', `${isSaved ? 'Remove' : 'Add'} ${button.dataset.productName} ${isSaved ? 'from' : 'to'} favorites`);
            button.querySelector('i').className = `${isSaved ? 'fa-solid' : 'fa-regular'} fa-heart`;
        });
    }

    function toggleSearchFavorite(button) {
        const { id, productName, category, categoryId, image, price, rating, reviewCount } = button.dataset;
        if (!id || !productName || !image) {
            console.error('Unable to update a search result favorite because product information is incomplete.', button);
            return;
        }

        try {
            const ids = readWishlistIds();
            const isSaved = ids.includes(id);
            const nextIds = isSaved ? ids.filter(savedId => savedId !== id) : [...ids, id];
            const details = readWishlistDetails().filter(item => item.id !== id);
            if (!isSaved) {
                details.push({
                    id,
                    name: productName,
                    category: category || categoryId,
                    image,
                    price: price === '' ? null : Number(price),
                    rating: rating === '' ? null : Number(rating),
                    reviewCount: reviewCount === '' ? null : Number(reviewCount)
                });
            }

            localStorage.setItem(wishlistDetailsKey, JSON.stringify(details));
            localStorage.setItem(wishlistKey, JSON.stringify(nextIds));
            window.dispatchEvent(new Event('aura:wishlist-updated'));
        } catch (error) {
            console.error('Unable to update a search result favorite.', error);
        }
    }

    function positionSearchPanels() {
        const navBounds = nav ? nav.getBoundingClientRect() : searchToggle.getBoundingClientRect();
        const formTop = Math.max(8, Math.min(navBounds.bottom + 8, window.innerHeight - 52));
        searchForm.style.top = `${formTop}px`;
        const resultsTop = formTop + 56;
        searchResults.style.top = `${resultsTop}px`;
        searchResults.style.maxHeight = `${Math.max(120, window.innerHeight - resultsTop - 8)}px`;
    }

    function setSearchOpen(isOpen) {
        searchBackdrop.hidden = !isOpen;
        searchForm.hidden = !isOpen;
        searchToggle.setAttribute('aria-expanded', String(isOpen));
        searchToggle.setAttribute('aria-label', isOpen ? 'Close product search' : 'Open product search');
        if (isOpen) {
            positionSearchPanels();
            searchForm.querySelector('input').focus();
        } else {
            searchRequestId += 1;
            if (searchDebounceTimer) {
                window.clearTimeout(searchDebounceTimer);
                searchDebounceTimer = null;
            }
            searchResults.hidden = true;
        }
    }

    async function searchProducts() {
        const requestId = ++searchRequestId;
        const query = normalizeSearchText(searchForm.querySelector('input').value);
        if (!query) {
            searchResults.hidden = true;
            return;
        }

        searchResults.replaceChildren(makeMessage('Searching products...', 'store-search-empty'));
        searchResults.hidden = false;
        try {
            const catalog = await loadCatalogProducts();
            let homeProducts = [];
            try {
                homeProducts = await loadHomeProducts();
            } catch (error) {
                console.error('Unable to load featured products for product search; searching catalog products only.', error);
            }
            const productsById = new Map(catalog.map(product => [product.id, product]));
            homeProducts.forEach(product => {
                const catalogProduct = productsById.get(product.id);
                if (!catalogProduct) {
                    productsById.set(product.id, product);
                } else if (product.description && !catalogProduct.description) {
                    catalogProduct.description = product.description;
                }
            });
            const products = [...productsById.values()];
            const queryTerms = query.split(/\s+/);
            const matches = products.filter(product => {
                const searchableText = normalizeSearchText([
                    product.name,
                    product.categoryLabel,
                    product.category,
                    product.searchTerms,
                    product.description
                ].join(' '));
                return queryTerms.every(term => searchableText.includes(term));
            });
            if (requestId === searchRequestId) {
                renderSearchResults(matches);
            }
        } catch (error) {
            if (requestId !== searchRequestId) {
                return;
            }
            console.error('Product search failed.', error);
            searchResults.replaceChildren(makeMessage('Product search is temporarily unavailable.', 'store-search-empty'));
            searchResults.hidden = false;
        }
    }

    async function renderWishlist() {
        const ids = readWishlistIds();
        const products = new Map(readWishlistDetails()
            .filter(product => product.image)
            .map(product => [product.id, product]));
        wishlistItems.replaceChildren();
        wishlistMessage.textContent = wishlistReadError;

        const missingIds = ids.filter(id => !products.has(id));
        if (missingIds.length) {
            try {
                const catalog = await loadCatalogProducts();
                catalog.forEach(product => {
                    if (missingIds.includes(product.id)) {
                        products.set(product.id, product);
                    }
                });
            } catch (error) {
                console.error('Unable to load saved products from the catalog.', error);
                wishlistMessage.textContent = 'Some saved items could not be loaded. Please try again later.';
            }
        }

        ids.forEach(id => {
            const product = products.get(id);
            if (!product) {
                return;
            }
            const row = document.createElement('article');
            row.className = 'wishlist-item';

            const image = document.createElement('img');
            image.src = product.image;
            image.alt = '';
            makeProductImageInteractive(image, {
                ...product,
                categoryLabel: product.categoryLabel || product.category || 'Product',
                available: product.price !== null
            });
            const details = document.createElement('div');
            details.className = 'wishlist-item-details';
            const name = document.createElement('strong');
            name.textContent = product.name;
            const category = document.createElement('span');
            category.textContent = product.categoryLabel || product.category || 'Product';
            details.append(name, category);

            if (product.price !== null && Number.isFinite(product.price)) {
                const price = document.createElement('span');
                price.className = 'wishlist-item-price';
                price.textContent = currency.format(product.price);
                details.appendChild(price);
            }

            const actions = document.createElement('div');
            actions.className = 'wishlist-item-actions';
            if (product.price !== null && Number.isFinite(product.price)) {
                const addButton = document.createElement('button');
                addButton.type = 'button';
                addButton.className = 'wishlist-item-add';
                addButton.dataset.cartAdd = '';
                addButton.dataset.id = product.id;
                addButton.dataset.name = product.name;
                addButton.dataset.price = String(product.price);
                addButton.dataset.image = product.image;
                addButton.setAttribute('aria-label', `Add ${product.name} to cart`);
                addButton.innerHTML = '<i class="fa-solid fa-cart-plus" aria-hidden="true"></i>';
                actions.appendChild(addButton);
            }

            const removeButton = document.createElement('button');
            removeButton.type = 'button';
            removeButton.className = 'wishlist-item-remove';
            removeButton.dataset.wishlistRemove = id;
            removeButton.setAttribute('aria-label', `Remove ${product.name} from saved items`);
            removeButton.innerHTML = '<i class="fa-solid fa-heart-crack" aria-hidden="true"></i>';
            actions.appendChild(removeButton);

            row.append(image, details, actions);
            wishlistItems.appendChild(row);
        });
        wishlistEmpty.hidden = wishlistItems.childElementCount > 0;
        if (ids.length > 0 && wishlistItems.childElementCount === 0 && !wishlistMessage.textContent) {
            wishlistMessage.textContent = 'Your saved products are no longer available.';
        }
    }

    function removeWishlistItem(id) {
        try {
            const ids = readWishlistIds().filter(savedId => savedId !== id);
            const details = readWishlistDetails().filter(product => product.id !== id);
            localStorage.setItem(wishlistKey, JSON.stringify(ids));
            localStorage.setItem(wishlistDetailsKey, JSON.stringify(details));
            window.dispatchEvent(new Event('aura:wishlist-updated'));
        } catch (error) {
            console.error('Unable to remove a saved product.', error);
            wishlistMessage.textContent = 'This item could not be removed. Please try again.';
        }
    }

    searchForm.addEventListener('submit', event => {
        event.preventDefault();
        if (searchDebounceTimer) {
            window.clearTimeout(searchDebounceTimer);
            searchDebounceTimer = null;
        }
        searchProducts();
    });
    searchForm.querySelector('input').addEventListener('input', () => {
        if (searchDebounceTimer) {
            window.clearTimeout(searchDebounceTimer);
        }
        searchDebounceTimer = window.setTimeout(() => {
            searchDebounceTimer = null;
            searchProducts();
        }, 120);
    });
    searchToggle.addEventListener('click', () => {
        setSearchOpen(searchForm.hidden);
    });
    window.addEventListener('resize', () => {
        if (!searchForm.hidden) {
            positionSearchPanels();
        }
    });
    window.addEventListener('scroll', () => {
        if (!searchForm.hidden) {
            positionSearchPanels();
        }
    }, true);
    searchForm.addEventListener('keydown', event => {
        if (event.key === 'Escape') {
            setSearchOpen(false);
            searchToggle.focus();
        }
    });

    document.addEventListener('click', event => {
        if (!search.contains(event.target)
            && !searchForm.contains(event.target)
            && !searchResults.contains(event.target)) {
            setSearchOpen(false);
        }

        const openWishlistButton = event.target.closest('[data-wishlist-open]');
        if (openWishlistButton) {
            wishlistTrigger = openWishlistButton;
            renderWishlist();
            wishlistDialog.showModal();
            wishlistDialog.querySelector('.wishlist-close').focus();
            return;
        }

        const removeButton = event.target.closest('[data-wishlist-remove]');
        if (removeButton) {
            removeWishlistItem(removeButton.dataset.wishlistRemove);
            return;
        }

        if (event.target.closest('.wishlist-close')) {
            wishlistDialog.close();
        }
    });

    wishlistDialog.addEventListener('click', event => {
        if (event.target === wishlistDialog) {
            wishlistDialog.close();
        }
    });
    wishlistDialog.addEventListener('close', () => {
        if (wishlistTrigger && wishlistTrigger.isConnected) {
            wishlistTrigger.focus();
        }
    });
    window.addEventListener('aura:wishlist-updated', () => {
        updateWishlistCount();
        syncDetailsFavoriteButton();
        updateSearchFavoriteButtons();
        if (wishlistDialog.open) {
            renderWishlist();
        }
    });
    window.addEventListener('storage', event => {
        if (event.key === wishlistKey || event.key === wishlistDetailsKey) {
            updateWishlistCount();
            syncDetailsFavoriteButton();
            updateSearchFavoriteButtons();
            if (wishlistDialog.open) {
                renderWishlist();
            }
        }
    });

    updateWishlistCount();
    if (window.location.hash === '#wishlist') {
        favoritesButton.click();
    }
})();
