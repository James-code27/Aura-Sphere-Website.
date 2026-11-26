(() => {
    const categories = [
        {
            id: 'clothes',
            label: 'Clothes',
            images: [
                'black gray.png', 'blue black.png', 'coffee white.png', 'gray black.png',
                'gray polo black.png', 'long white black.png', 'white polo black.png',
                'whiteblack.png'
            ]
        },
        {
            id: 'electronics',
            label: 'Electronics',
            images: ['airpods.png', 'camera.png', 'drone.png', 'headphone.png', 'keyboard.png', 'power back.png', 'speaker.png', 'watch.png']
        },
        {
            id: 'perfume',
            label: 'Perfume',
            images: ['blue.png', 'box.png', 'bronze.png', 'circle.png', 'diamond.png', 'gray.png', 'light green.png', 'red.png']
        },
        {
            id: 'fitness',
            label: 'Fitness',
            images: ['bag.png', 'dumbbell.png', 'fitness belt.png', 'fitness watch.png', 'loop hoop.png', 'shoes.png', 'tumbler.png', 'weighs.png']
        },
        {
            id: 'footware',
            label: 'Footware',
            images: ['shoes1.png', 'shoes2.png', 'shoes3.png', 'shoes4.png', 'shoes5.png', 'shoes6.png', 'shoes7.png', 'shoes8.png']
        },
        {
            id: 'accessories',
            label: 'Accessories',
            images: ['belt.png', 'gloves.png', 'hat.png', 'nickless.png', 'nicktie1.png', 'nicktie2.png', 'shades.png', 'wallet.png']
        },
        {
            id: 'bags',
            label: 'Bags',
            images: ['backpack1.png', 'backpack2.png', 'backpack3.png', 'backpack4.png', 'backpack5.png', 'backpack6.png', 'backpack7.png', 'backpack8.png']
        },
        {
            id: 'home-decor',
            label: 'Home decor',
            images: ['clock.png', 'flower pot.png', 'gold candle.png', 'lamp.png', 'metal.png', 'phone stand.png', 'tea pot.png', 'wood.png']
        },
        {
            id: 'new-arrival',
            label: 'New arrival',
            images: ['hoodie.png', 'shoes11.png', 'headphone1.png', 'watch11.png', 'tumbler11.png', 'shades11.png']
        }
    ];
    const databaseCategories = new Map(
        categories.filter(category => category.id !== 'new-arrival').map(category => [category.id, category])
    );

    const listedProducts = {
        'fitness|shoes.png': { id: 'hero-fitville-wide', name: 'FitVille Wide', price: 345.99 },
        'fitness|tumbler.png': { id: 'hero-water-bottle', name: 'Water Bottle', price: 120.99 },
        'new-arrival|hoodie.png': { id: 'graffiti-hoodie', name: 'Graffiti Hoodie', price: 180.99 },
        'new-arrival|shoes11.png': { id: 'mainstream-shoes', name: 'Mainstream', price: 223.00 },
        'new-arrival|headphone1.png': { id: 'black-headphone', name: 'Black Headphone', price: 245.99 },
        'new-arrival|watch11.png': { id: 'smart-watch-new', name: 'Smart Watch', price: 134.00 },
        'new-arrival|tumbler11.png': { id: 'water-bottle-new', name: 'Water Bottle', price: 43.99 },
        'new-arrival|shades11.png': { id: 'shades', name: 'Shades', price: 14.00 }
    };
    const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
    const wishlistKey = 'auraSphereWishlist';
    const wishlistDetailsKey = 'auraSphereWishlistDetails';
    const assetRoot = document.body.dataset.assetRoot || document.body.dataset.siteRoot || '../';

    function titleFromFile(fileName) {
        const baseName = fileName.split('/').pop().replace(/\.[^.]+$/, '');
        return baseName.replace(/[-_]+/g, ' ').replace(/\b[a-z]/g, letter => letter.toUpperCase());
    }

    function slugFromFile(fileName) {
        return fileName.toLowerCase().replace(/\.[^.]+$/, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    }

    function generatedPrice(categoryId, imageName) {
        const key = `${categoryId}|${imageName}`;
        let hash = 2166136261;
        for (let index = 0; index < key.length; index += 1) {
            hash ^= key.charCodeAt(index);
            hash = Math.imul(hash, 16777619);
        }
        return (hash >>> 0) % 1000 + 1;
    }

    function getProductDetails(category, imageName, databaseProduct = null) {
        const listed = databaseProduct || listedProducts[`${category.id}|${imageName}`] || null;
        const name = listed ? listed.name : titleFromFile(imageName);
        const id = listed ? listed.id : `catalog-${category.id}-${slugFromFile(imageName)}`;
        const imageFolder = category.id === 'new-arrival' ? 'new-arrival' : category.id === 'home-decor' ? 'home decor' : category.id;
        const imagePath = listed && listed.image
            ? listed.image
            : `${assetRoot}image/${imageFolder}/${imageName.split('/').map(encodeURIComponent).join('/')}`;
        const priceValue = listed
            ? (listed.price_cents === undefined ? Number(listed.price) : Number(listed.price_cents) / 100)
            : generatedPrice(category.id, imageName);
        return { listed, name, id, imagePath, priceValue };
    }

    window.auraCatalogProducts = categories.flatMap(category => category.images.map(imageName => {
        const { listed, name, id, imagePath, priceValue } = getProductDetails(category, imageName);
        return {
            id,
            name,
            category: category.id,
            categoryLabel: category.label,
            image: imagePath,
            price: priceValue,
            rating: listed && listed.rating !== undefined ? listed.rating : null,
            reviewCount: listed && listed.review_count !== undefined ? listed.review_count : null,
            cartEnabled: true,
            searchTerms: `${name} ${titleFromFile(imageName)}`
        };
    }));

    function readWishlist() {
        try {
            const stored = JSON.parse(localStorage.getItem(wishlistKey) || '[]');
            return new Set(Array.isArray(stored) ? stored.filter(value => typeof value === 'string') : []);
        } catch (error) {
            console.error('Unable to read the saved wishlist.', error);
            return new Set();
        }
    }

    let wishlist = readWishlist();

    function saveWishlist() {
        try {
            localStorage.setItem(wishlistKey, JSON.stringify([...wishlist]));
        } catch (error) {
            console.error('Unable to save the wishlist.', error);
        }
    }

    function saveWishlistDetails(favorite, isFavorite) {
        try {
            const stored = JSON.parse(localStorage.getItem(wishlistDetailsKey) || '[]');
            if (!Array.isArray(stored)) {
                throw new TypeError('Saved wishlist details are not a list.');
            }

            const details = stored.filter(item => item && item.id !== favorite.dataset.id);
            if (isFavorite) {
                const price = Number(favorite.dataset.price);
                details.push({
                    id: favorite.dataset.id,
                    name: favorite.dataset.productName,
                    category: favorite.dataset.category,
                    image: favorite.dataset.image,
                    price: Number.isFinite(price) && favorite.dataset.price !== '' ? price : null,
                    rating: favorite.dataset.rating === '' ? null : Number(favorite.dataset.rating),
                    reviewCount: favorite.dataset.reviewCount === '' ? null : Number(favorite.dataset.reviewCount)
                });
            }
            localStorage.setItem(wishlistDetailsKey, JSON.stringify(details));
        } catch (error) {
            console.error('Unable to save wishlist product details.', error);
        }
    }

    function makeButton(className, label, iconClass) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = className;
        button.setAttribute('aria-label', label);
        const icon = document.createElement('i');
        icon.className = iconClass;
        icon.setAttribute('aria-hidden', 'true');
        button.appendChild(icon);
        return button;
    }

    function createProductCard(category, imageName, databaseProduct = null) {
        const productDetails = getProductDetails(category, imageName, databaseProduct);
        const { listed, name, id, imagePath, priceValue } = productDetails;
        const card = document.createElement('article');
        card.className = 'catalog-product-card';
        card.dataset.productId = id;
        card.dataset.productName = name;
        card.dataset.productCategory = category.label;
        card.dataset.productCategoryId = category.id;
        card.dataset.productImage = imagePath;
        card.dataset.productPrice = String(priceValue);
        card.dataset.productAvailable = 'true';
        if (listed && listed.rating !== undefined) {
            card.dataset.productRating = String(listed.rating);
            card.dataset.productReviewCount = String(listed.review_count ?? '');
        }

        const visual = document.createElement('div');
        visual.className = 'catalog-product-visual';

        const image = document.createElement('img');
        image.src = imagePath;
        image.alt = name;
        image.loading = 'lazy';
        image.dataset.productDetailsTrigger = '';
        image.dataset.productId = id;
        image.dataset.productName = name;
        image.dataset.productCategory = category.label;
        image.dataset.productCategoryId = category.id;
        image.dataset.productImage = imagePath;
        image.dataset.productPrice = String(priceValue);
        image.dataset.productAvailable = 'true';
        image.dataset.productCartEnabled = 'true';
        image.dataset.productRating = listed && listed.rating !== undefined ? String(listed.rating) : '';
        image.dataset.productReviewCount = listed && listed.review_count !== undefined ? String(listed.review_count) : '';
        image.tabIndex = 0;
        image.setAttribute('role', 'button');
        image.setAttribute('aria-label', `View details for ${name}`);
        visual.appendChild(image);

        const badge = document.createElement('span');
        badge.className = 'catalog-product-badge';
        badge.textContent = 'New';
        visual.appendChild(badge);

        const favorite = makeButton('catalog-favorite', `Add ${name} to favorites`, 'fa-regular fa-heart');
        favorite.dataset.wishlistToggle = '';
        favorite.dataset.id = id;
        favorite.dataset.productName = name;
        favorite.dataset.category = category.label;
        favorite.dataset.categoryId = category.id;
        favorite.dataset.image = imagePath;
        favorite.dataset.price = String(priceValue);
        favorite.dataset.rating = listed && listed.rating !== undefined ? String(listed.rating) : '';
        favorite.dataset.reviewCount = listed && listed.review_count !== undefined ? String(listed.review_count) : '';
        favorite.setAttribute('aria-pressed', String(wishlist.has(id)));
        if (wishlist.has(id)) {
            favorite.setAttribute('aria-label', `Remove ${name} from favorites`);
            favorite.querySelector('i').className = 'fa-solid fa-heart';
        }
        visual.appendChild(favorite);

        const details = document.createElement('div');
        details.className = 'catalog-product-details';

        const title = document.createElement('h3');
        title.textContent = name;
        details.appendChild(title);

        const price = document.createElement('p');
        price.className = 'catalog-product-price';
        price.textContent = currency.format(priceValue);
        details.appendChild(price);

        const rating = document.createElement('span');
        rating.className = 'catalog-product-rating';
        rating.setAttribute('role', 'img');
        rating.setAttribute('aria-label', '5 out of 5 stars');
        rating.textContent = '★★★★★';
        details.appendChild(rating);

        const actions = document.createElement('div');
        actions.className = 'catalog-product-actions';

        const status = document.createElement('span');
        status.className = 'catalog-product-status';
        status.textContent = 'Listed';
        actions.appendChild(status);

        const addToCart = makeButton('catalog-cart-button', `Add ${name} to cart`, 'fa-solid fa-cart-shopping');
        addToCart.dataset.cartAdd = '';
        addToCart.dataset.id = id;
        addToCart.dataset.name = name;
        addToCart.dataset.price = String(priceValue);
        addToCart.dataset.image = imagePath;
        actions.appendChild(addToCart);

        details.appendChild(actions);
        card.append(visual, details);
        return card;
    }

    categories.forEach(category => {
        const grid = document.querySelector(`[data-catalog-category="${category.id}"]`);
        if (!grid) {
            return;
        }

        const loadingMessage = grid.querySelector('.category-products-loading');
        if (loadingMessage) {
            loadingMessage.remove();
        }

        category.images.forEach(imageName => {
            grid.appendChild(createProductCard(category, imageName));
        });
    });

    const categoryDropdown = document.querySelector('.dropdown');
    const categoryToggle = document.querySelector('[data-category-toggle]');
    if (categoryDropdown && categoryToggle) {
        const closeCategoryMenu = () => {
            categoryDropdown.classList.remove('open');
            categoryToggle.setAttribute('aria-expanded', 'false');
        };

        categoryToggle.addEventListener('click', () => {
            const isOpen = categoryDropdown.classList.toggle('open');
            categoryToggle.setAttribute('aria-expanded', String(isOpen));
        });
        categoryDropdown.querySelectorAll('.menu a').forEach(link => {
            link.addEventListener('click', closeCategoryMenu);
        });
        document.addEventListener('click', event => {
            if (!categoryDropdown.contains(event.target)) {
                closeCategoryMenu();
            }
        });
        document.addEventListener('keydown', event => {
            if (event.key === 'Escape') {
                closeCategoryMenu();
            }
        });
    }

    document.addEventListener('click', event => {
        const favorite = event.target.closest('[data-wishlist-toggle]');
        if (!favorite) {
            return;
        }

        const { id } = favorite.dataset;
        if (wishlist.has(id)) {
            wishlist.delete(id);
        } else {
            wishlist.add(id);
        }
        saveWishlist();

        const isFavorite = wishlist.has(id);
        favorite.setAttribute('aria-pressed', String(isFavorite));
        favorite.setAttribute('aria-label', `${isFavorite ? 'Remove' : 'Add'} ${favorite.dataset.productName} ${isFavorite ? 'from' : 'to'} favorites`);
        favorite.querySelector('i').className = isFavorite ? 'fa-solid fa-heart' : 'fa-regular fa-heart';
        saveWishlistDetails(favorite, isFavorite);
        window.dispatchEvent(new Event('aura:wishlist-updated'));
    });

    window.addEventListener('aura:wishlist-updated', () => {
        wishlist = readWishlist();
        document.querySelectorAll('[data-wishlist-toggle]').forEach(favorite => {
            const isFavorite = wishlist.has(favorite.dataset.id);
            favorite.setAttribute('aria-pressed', String(isFavorite));
            favorite.setAttribute('aria-label', `${isFavorite ? 'Remove' : 'Add'} ${favorite.dataset.productName} ${isFavorite ? 'from' : 'to'} favorites`);
            favorite.querySelector('i').className = isFavorite ? 'fa-solid fa-heart' : 'fa-regular fa-heart';
        });
    });
})();
