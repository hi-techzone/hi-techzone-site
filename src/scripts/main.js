// FlipMart E-commerce Application
class FlipMart {
    constructor() {
        this.products = [];
        this.cart = this.loadFromStorage('cart') || [];
        this.favorites = this.loadFromStorage('favorites') || [];
        this.wishlist = this.loadFromStorage('wishlist') || [];
        this.compareList = this.loadFromStorage('compareList') || [];
        this.currentView = 'home';
        this.currentProduct = null;
        this.filteredProducts = [];
        this.categories = new Set();
        this.brands = new Set();
        this.isGridView = true;
        this.quickFilters = {
            discount: false,
            rating: false,
            new: false,
            premium: false
        };
        
        this.init();
    }

    async init() {
        try {
            await this.loadProducts();
            this.setupEventListeners();
            this.setupDynamicFilters();
            this.updateCounts();
            this.displayProducts();
            this.setupScrollEffects();
        } catch (error) {
            console.error('Failed to initialize FlipMart:', error);
            this.showToast('Failed to load products', 'error');
        }
    }

    async loadProducts() {
        try {
            const response = await fetch('src/data/products.json');
            if (!response.ok) throw new Error('Failed to fetch products');
            this.products = await response.json();
            this.filteredProducts = [...this.products];
            this.extractCategoriesAndBrands();
        } catch (error) {
            console.error('Error loading products:', error);
            throw error;
        }
    }

    extractCategoriesAndBrands() {
        this.products.forEach(product => {
            this.categories.add(product.category);
            this.brands.add(product.brand);
        });
    }

    setupDynamicFilters() {
        this.setupCategoryFilters();
        this.setupBrandFilters();
        this.setupAdvancedSearchOptions();
    }

    setupCategoryFilters() {
        const container = $('#category-filters');
        container.empty();
        
        // Add "All Categories" option
        container.append(`
            <div class="form-check">
                <input class="form-check-input" type="radio" name="category" id="all-categories" value="all" checked>
                <label class="form-check-label" for="all-categories">All Categories</label>
            </div>
        `);
        
        // Add dynamic categories
        Array.from(this.categories).sort().forEach(category => {
            const categoryId = category.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
            const categoryName = this.formatCategoryName(category);
            container.append(`
                <div class="form-check">
                    <input class="form-check-input" type="radio" name="category" id="${categoryId}" value="${category}">
                    <label class="form-check-label" for="${categoryId}">${categoryName}</label>
                </div>
            `);
        });
    }

    setupBrandFilters() {
        const container = $('#brand-filters');
        container.empty();
        
        Array.from(this.brands).sort().forEach(brand => {
            const brandId = brand.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
            container.append(`
                <div class="form-check">
                    <input class="form-check-input" type="checkbox" id="${brandId}" value="${brand}">
                    <label class="form-check-label" for="${brandId}">${brand}</label>
                </div>
            `);
        });
    }

    setupAdvancedSearchOptions() {
        const brandSelect = $('#adv-search-brand');
        const categorySelect = $('#adv-search-category');
        
        Array.from(this.brands).sort().forEach(brand => {
            brandSelect.append(`<option value="${brand}">${brand}</option>`);
        });
        
        Array.from(this.categories).sort().forEach(category => {
            const categoryName = this.formatCategoryName(category);
            categorySelect.append(`<option value="${category}">${categoryName}</option>`);
        });
    }

    formatCategoryName(category) {
        return category.split('-').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    }

    setupScrollEffects() {
        $(window).on('scroll', () => {
            const scrollTop = $(window).scrollTop();
            if (scrollTop > 100) {
                $('.navbar').addClass('scrolled');
            } else {
                $('.navbar').removeClass('scrolled');
            }
        });
    }

    setupEventListeners() {
        // Navigation
        $('#home-link').on('click', (e) => { e.preventDefault(); this.showView('home'); });
        $('#cart-btn').on('click', () => this.showView('cart'));
        $('#favorites-btn').on('click', () => this.showView('favorites'));
        $('#wishlist-btn').on('click', () => this.showView('wishlist'));
        $('#compare-btn').on('click', () => this.showView('compare'));
        
        // Back buttons
        $('#back-to-home, #back-from-cart, #back-from-favorites, #back-from-wishlist, #back-from-compare').on('click', () => this.showView('home'));

        // Contact and account links
        $('#contact-shop-link').on('click', (e) => {
            e.preventDefault();
            const contactModal = new bootstrap.Modal($('#contactModal')[0]);
            contactModal.show();
        });

        // Search
        $('#search-input').on('input', (e) => this.handleSearch(e.target.value));
        $('#search-btn').on('click', () => this.handleSearch($('#search-input').val()));

        // Advanced search
        $('#search-input').on('dblclick', () => {
            const advSearchModal = new bootstrap.Modal($('#advancedSearchModal')[0]);
            advSearchModal.show();
        });
        
        $('#apply-advanced-search').on('click', () => this.applyAdvancedSearch());
        $('#clear-advanced-search').on('click', () => this.clearAdvancedSearch());

        // Filters
        $('input[name="category"]').on('change', () => this.applyFilters());
        $('.brand-filters input[type="checkbox"]').on('change', () => this.applyFilters());
        $('#price-range').on('input', (e) => {
            $('#price-display').text('₹' + parseInt(e.target.value).toLocaleString('en-IN') + '+');
            this.applyFilters();
        });
        $('#sort-select').on('change', () => this.applyFilters());

        // Quick filters
        $('.quick-filter').on('click', (e) => {
            const filter = $(e.currentTarget).data('filter');
            this.toggleQuickFilter(filter, $(e.currentTarget));
        });
        
        // Clear filters
        $('#clear-filters').on('click', () => this.clearAllFilters());
        
        // View toggle
        $('#grid-view').on('change', (e) => {
            this.isGridView = e.target.checked;
            this.displayProducts();
        });
        
        // In stock filter
        $('#in-stock-only').on('change', () => this.applyFilters());

        // Product interactions
        $(document).on('click', '.product-card', (e) => {
            if (!$(e.target).closest('.action-buttons').length) {
                const productId = $(e.currentTarget).data('product-id');
                this.showProductDetail(productId);
            }
        });

        $(document).on('click', '.btn-favorite', (e) => {
            e.stopPropagation();
            const productId = $(e.currentTarget).data('product-id');
            this.toggleFavorite(productId);
        });

        $(document).on('click', '.btn-wishlist', (e) => {
            e.stopPropagation();
            const productId = $(e.currentTarget).data('product-id');
            this.toggleWishlist(productId);
        });

        $(document).on('click', '.btn-compare', (e) => {
            e.stopPropagation();
            const productId = $(e.currentTarget).data('product-id');
            this.toggleCompare(productId);
        });

        $(document).on('click', '.btn-cart', (e) => {
            e.stopPropagation();
            const productId = $(e.currentTarget).data('product-id');
            this.addToCart(productId);
        });

        // Cart interactions
        $(document).on('click', '.quantity-btn', (e) => {
            const productId = $(e.currentTarget).data('product-id');
            const action = $(e.currentTarget).data('action');
            this.updateCartQuantity(productId, action);
        });

        $(document).on('click', '.remove-from-cart', (e) => {
            const productId = $(e.currentTarget).data('product-id');
            this.removeFromCart(productId);
        });

        $('#generate-bill').on('click', () => this.generateBill());
        $('#place-order').on('click', () => this.placeOrder());

        // Quick actions
        $(document).on('click', '.quick-add-cart', (e) => {
            e.stopPropagation();
            const productId = $(e.currentTarget).data('product-id');
            this.addToCart(productId);
        });

        // Image gallery
        $(document).on('click', '.product-detail-image, .thumbnail', (e) => {
            const imageSrc = $(e.currentTarget).attr('src') || $(e.currentTarget).data('image');
            this.showImageGallery(imageSrc);
        });
        
        // Floating action button
        $('body').append(`
            <button class="floating-action-btn" id="scroll-to-top" title="Scroll to top">
                <i class="bi bi-arrow-up"></i>
            </button>
        `);
        
        $('#scroll-to-top').on('click', () => {
            $('html, body').animate({ scrollTop: 0 }, 500);
        });
    }

    showView(viewName) {
        $('.view-container').addClass('d-none');
        $(`#${viewName}-view`).removeClass('d-none');
        this.currentView = viewName;

        switch (viewName) {
            case 'home':
                this.displayProducts();
                break;
            case 'cart':
                this.displayCart();
                break;
            case 'favorites':
                this.displayFavorites();
                break;
            case 'wishlist':
                this.displayWishlist();
                break;
            case 'compare':
                this.displayComparison();
                break;
        }
    }

    handleSearch(query) {
        if (!query.trim()) {
            this.filteredProducts = [...this.products];
        } else {
            this.filteredProducts = this.products.filter(product =>
                product.name.toLowerCase().includes(query.toLowerCase()) ||
                product.brand.toLowerCase().includes(query.toLowerCase()) ||
                product.category.toLowerCase().includes(query.toLowerCase()) ||
                product.description.toLowerCase().includes(query.toLowerCase())
            );
        }
        this.applyFilters();
    }

    applyAdvancedSearch() {
        const name = $('#adv-search-name').val().toLowerCase();
        const brand = $('#adv-search-brand').val();
        const category = $('#adv-search-category').val();
        const rating = parseFloat($('#adv-search-rating').val()) || 0;
        const minPrice = parseInt($('#adv-search-min-price').val()) || 0;
        const maxPrice = parseInt($('#adv-search-max-price').val()) || Infinity;
        const features = $('#adv-search-features').val().toLowerCase();
        
        this.filteredProducts = this.products.filter(product => {
            const matchesName = !name || product.name.toLowerCase().includes(name);
            const matchesBrand = !brand || product.brand === brand;
            const matchesCategory = !category || product.category === category;
            const matchesRating = product.rating >= rating;
            const matchesPrice = product.price >= minPrice && product.price <= maxPrice;
            const matchesFeatures = !features || product.features.some(feature => 
                feature.toLowerCase().includes(features)
            );
            
            return matchesName && matchesBrand && matchesCategory && 
                   matchesRating && matchesPrice && matchesFeatures;
        });
        
        const advSearchModal = bootstrap.Modal.getInstance($('#advancedSearchModal')[0]);
        advSearchModal.hide();
        
        this.displayProducts();
        this.showToast(`Found ${this.filteredProducts.length} products`, 'info');
    }
    
    clearAdvancedSearch() {
        $('#adv-search-name, #adv-search-features, #adv-search-min-price, #adv-search-max-price').val('');
        $('#adv-search-brand, #adv-search-category, #adv-search-rating').val('');
    }

    toggleQuickFilter(filter, button) {
        this.quickFilters[filter] = !this.quickFilters[filter];
        button.toggleClass('active', this.quickFilters[filter]);
        this.applyFilters();
    }
    
    clearAllFilters() {
        // Reset category
        $('#all-categories').prop('checked', true);
        
        // Reset brands
        $('.brand-filters input[type="checkbox"]').prop('checked', false);
        
        // Reset price
        $('#price-range').val(200000);
        $('#price-display').text('₹2,00,000+');
        
        // Reset sort
        $('#sort-select').val('relevance');
        
        // Reset quick filters
        $('.quick-filter').removeClass('active');
        Object.keys(this.quickFilters).forEach(key => {
            this.quickFilters[key] = false;
        });
        
        // Reset search
        $('#search-input').val('');
        
        this.filteredProducts = [...this.products];
        this.applyFilters();
    }

    applyFilters() {
        let filtered = [...this.filteredProducts];

        // Category filter
        const selectedCategory = $('input[name="category"]:checked').val();
        if (selectedCategory !== 'all') {
            filtered = filtered.filter(product => product.category === selectedCategory);
        }

        // Brand filter
        const selectedBrands = $('.brand-filters input[type="checkbox"]:checked').map(function() {
            return $(this).val();
        }).get();
        if (selectedBrands.length > 0) {
            filtered = filtered.filter(product => selectedBrands.includes(product.brand));
        }

        // In stock filter
        const inStockOnly = $('#in-stock-only').is(':checked');
        if (inStockOnly) {
            filtered = filtered.filter(product => product.inStock);
        }

        // Price filter
        const maxPrice = parseInt($('#price-range').val());
        filtered = filtered.filter(product => product.price <= maxPrice);

        // Quick filters
        if (this.quickFilters.discount) {
            filtered = filtered.filter(product => product.discount > 0);
        }
        if (this.quickFilters.rating) {
            filtered = filtered.filter(product => product.rating >= 4.5);
        }
        if (this.quickFilters.new) {
            // Assuming newer products have higher IDs
            const sortedById = [...this.products].sort((a, b) => b.id.localeCompare(a.id));
            const newProductIds = sortedById.slice(0, Math.ceil(sortedById.length * 0.2)).map(p => p.id);
            filtered = filtered.filter(product => newProductIds.includes(product.id));
        }
        if (this.quickFilters.premium) {
            filtered = filtered.filter(product => product.tags && product.tags.includes('premium'));
        }

        // Sort
        const sortBy = $('#sort-select').val();
        filtered = this.sortProducts(filtered, sortBy);

        this.displayProducts(filtered);
    }

    sortProducts(products, sortBy) {
        switch (sortBy) {
            case 'price-low-high':
                return products.sort((a, b) => a.price - b.price);
            case 'price-high-low':
                return products.sort((a, b) => b.price - a.price);
            case 'rating':
                return products.sort((a, b) => b.rating - a.rating);
            case 'newest':
                return products.reverse();
            case 'discount':
                return products.sort((a, b) => b.discount - a.discount);
            case 'popularity':
                return products.sort((a, b) => b.reviews - a.reviews);
            default:
                return products;
        }
    }

    displayProducts(productsToShow = this.filteredProducts) {
        const container = $('#products-container');
        container.empty();

        $('#products-count').text(productsToShow.length);

        if (productsToShow.length === 0) {
            container.html(`
                <div class="col-12">
                    <div class="empty-state">
                        <i class="bi bi-search"></i>
                        <h4>No products found</h4>
                        <p>Try adjusting your search or filters</p>
                    </div>
                </div>
            `);
            return;
        }

        productsToShow.forEach(product => {
            const productCard = this.createProductCard(product);
            container.append(productCard);
        });
        
        // Add staggered animation
        $('.product-card').each((index, element) => {
            setTimeout(() => {
                $(element).addClass('fade-in-up');
            }, index * 100);
        });
    }

    createProductCard(product) {
        const isFavorite = this.favorites.includes(product.id);
        const inWishlist = this.wishlist.includes(product.id);
        const inCompare = this.compareList.includes(product.id);
        const discount = product.discount > 0 ? `<span class="discount-badge">${product.discount}% OFF</span>` : '';

        if (this.isGridView) {
            return $(`
                <div class="col-lg-3 col-md-4 col-sm-6 mb-4">
                    <div class="card product-card h-100 position-relative" data-product-id="${product.id}">
                        ${product.tags && product.tags.includes('bestseller') ? '<div class="product-badge"><span class="badge bg-warning">Bestseller</span></div>' : ''}
                        ${!product.inStock ? '<div class="product-badge"><span class="badge bg-danger">Out of Stock</span></div>' : ''}
                        <div class="product-actions">
                            <button class="btn btn-outline-danger btn-icon btn-favorite ${isFavorite ? 'active' : ''}" 
                                    data-product-id="${product.id}" title="Add to Favorites">
                                <i class="bi bi-heart${isFavorite ? '-fill' : ''}"></i>
                            </button>
                            <button class="btn btn-outline-warning btn-icon btn-wishlist ${inWishlist ? 'active' : ''}" 
                                    data-product-id="${product.id}" title="Add to Wishlist">
                                <i class="bi bi-bookmark${inWishlist ? '-fill' : ''}"></i>
                            </button>
                        </div>
                        <img src="${product.images[0]}" class="product-image" alt="${product.name}">
                        <div class="product-info">
                            <div class="product-brand">${product.brand}</div>
                            <h5 class="product-title">${product.name}</h5>
                            <div class="rating-section">
                                <span class="rating-stars">${this.generateStars(product.rating)}</span>
                                <span class="rating-value">${product.rating}</span>
                                <span class="reviews-count">(${product.reviews})</span>
                            </div>
                            <div class="price-section">
                                <span class="current-price">₹${product.price.toLocaleString('en-IN')}</span>
                                ${product.originalPrice > product.price ? `<span class="original-price">₹${product.originalPrice.toLocaleString('en-IN')}</span>` : ''}
                                ${discount}
                            </div>
                            <div class="action-buttons">
                                <button class="btn btn-outline-info btn-icon btn-compare ${inCompare ? 'active' : ''}" 
                                        data-product-id="${product.id}" title="Add to Compare">
                                    <i class="bi bi-arrow-left-right"></i>
                                </button>
                                <button class="btn btn-primary flex-grow-1 btn-cart" data-product-id="${product.id}" ${!product.inStock ? 'disabled' : ''}>
                                    <i class="bi bi-cart-plus me-2"></i>${product.inStock ? 'Add to Cart' : 'Out of Stock'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `);
        } else {
            return $(`
                <div class="col-12 mb-3">
                    <div class="product-list-item" data-product-id="${product.id}">
                        <img src="${product.images[0]}" class="product-list-image" alt="${product.name}">
                        <div class="flex-grow-1">
                            <div class="d-flex justify-content-between align-items-start mb-2">
                                <div>
                                    <div class="product-brand text-muted">${product.brand}</div>
                                    <h5 class="product-title mb-1">${product.name}</h5>
                                    <div class="rating-section mb-2">
                                        <span class="rating-stars">${this.generateStars(product.rating)}</span>
                                        <span class="rating-value">${product.rating}</span>
                                        <span class="reviews-count">(${product.reviews})</span>
                                    </div>
                                </div>
                                <div class="text-end">
                                    <div class="price-section mb-2">
                                        <span class="current-price">₹${product.price.toLocaleString('en-IN')}</span>
                                        ${product.originalPrice > product.price ? `<span class="original-price">₹${product.originalPrice.toLocaleString('en-IN')}</span>` : ''}
                                        ${discount}
                                    </div>
                                    <div class="action-buttons">
                                        <button class="btn btn-outline-danger btn-icon btn-favorite ${isFavorite ? 'active' : ''}" 
                                                data-product-id="${product.id}" title="Add to Favorites">
                                            <i class="bi bi-heart${isFavorite ? '-fill' : ''}"></i>
                                        </button>
                                        <button class="btn btn-outline-warning btn-icon btn-wishlist ${inWishlist ? 'active' : ''}" 
                                                data-product-id="${product.id}" title="Add to Wishlist">
                                            <i class="bi bi-bookmark${inWishlist ? '-fill' : ''}"></i>
                                        </button>
                                        <button class="btn btn-outline-info btn-icon btn-compare ${inCompare ? 'active' : ''}" 
                                                data-product-id="${product.id}" title="Add to Compare">
                                            <i class="bi bi-arrow-left-right"></i>
                                        </button>
                                        <button class="btn btn-primary btn-cart" data-product-id="${product.id}" ${!product.inStock ? 'disabled' : ''}>
                                            <i class="bi bi-cart-plus me-2"></i>${product.inStock ? 'Add to Cart' : 'Out of Stock'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <p class="text-muted mb-0">${product.description}</p>
                        </div>
                    </div>
                </div>
            `);
        }
    }

    generateStars(rating) {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;
        let stars = '';
        
        for (let i = 0; i < fullStars; i++) {
            stars += '<i class="bi bi-star-fill"></i>';
        }
        
        if (hasHalfStar) {
            stars += '<i class="bi bi-star-half"></i>';
        }
        
        const emptyStars = 5 - Math.ceil(rating);
        for (let i = 0; i < emptyStars; i++) {
            stars += '<i class="bi bi-star"></i>';
        }
        
        return stars;
    }

    showProductDetail(productId) {
        const product = this.products.find(p => p.id === productId);
        if (!product) return;

        this.currentProduct = product;
        const isFavorite = this.favorites.includes(product.id);
        const inWishlist = this.wishlist.includes(product.id);
        const inCompare = this.compareList.includes(product.id);

        const detailContent = `
            <div class="row">
                <div class="col-lg-6">
                    <img src="${product.images[0]}" class="product-detail-image" alt="${product.name}" id="main-product-image">
                    <div class="thumbnail-images">
                        ${product.images.map(img => `<img src="${img}" class="thumbnail" alt="${product.name}">`).join('')}
                    </div>
                </div>
                <div class="col-lg-6">
                    <div class="p-4">
                        <div class="mb-2">
                            <span class="badge bg-secondary">${product.brand}</span>
                            <span class="badge bg-primary ms-2">${product.category}</span>
                        </div>
                        <h1 class="h2 mb-3">${product.name}</h1>
                        <div class="rating-section mb-3">
                            <span class="rating-stars">${this.generateStars(product.rating)}</span>
                            <span class="rating-value">${product.rating}</span>
                            <span class="reviews-count">(${product.reviews} reviews)</span>
                        </div>
                        <div class="price-section mb-4">
                            <span class="current-price fs-3">₹${product.price.toLocaleString('en-IN')}</span>
                            ${product.originalPrice > product.price ? `<span class="original-price fs-5">₹${product.originalPrice.toLocaleString('en-IN')}</span>` : ''}
                            ${product.discount > 0 ? `<span class="discount-badge">${product.discount}% OFF</span>` : ''}
                        </div>
                        <p class="mb-4">${product.description}</p>
                        
                        <div class="row mb-4">
                            <div class="col-md-6">
                                <h5>Key Features</h5>
                                <ul class="feature-list">
                                    ${product.features.map(feature => `<li>${feature}</li>`).join('')}
                                </ul>
                            </div>
                            <div class="col-md-6">
                                <h5>Specifications</h5>
                                <table class="table table-sm">
                                    ${Object.entries(product.specifications).map(([key, value]) => 
                                        `<tr><td><strong>${key}:</strong></td><td>${value}</td></tr>`
                                    ).join('')}
                                </table>
                            </div>
                        </div>
                        
                        <div class="d-flex gap-3">
                            <button class="btn btn-outline-danger btn-favorite ${isFavorite ? 'active' : ''}" 
                                    data-product-id="${product.id}">
                                <i class="bi bi-heart${isFavorite ? '-fill' : ''}"></i>
                                ${isFavorite ? 'Remove from' : 'Add to'} Favorites
                            </button>
                            <button class="btn btn-outline-warning btn-wishlist ${inWishlist ? 'active' : ''}" 
                                    data-product-id="${product.id}">
                                <i class="bi bi-bookmark${inWishlist ? '-fill' : ''}"></i>
                                ${inWishlist ? 'Remove from' : 'Add to'} Wishlist
                            </button>
                            <button class="btn btn-outline-info btn-compare ${inCompare ? 'active' : ''}" 
                                    data-product-id="${product.id}">
                                <i class="bi bi-arrow-left-right"></i>
                                ${inCompare ? 'Remove from' : 'Add to'} Compare
                            </button>
                            <button class="btn btn-primary btn-cart flex-grow-1" data-product-id="${product.id}" ${!product.inStock ? 'disabled' : ''}>
                                <i class="bi bi-cart-plus me-2"></i>${product.inStock ? 'Add to Cart' : 'Out of Stock'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        $('#product-detail-content').html(detailContent);
        this.showView('product-detail');

        // Setup thumbnail click handlers
        $('.thumbnail').on('click', function() {
            const newSrc = $(this).attr('src');
            $('#main-product-image').attr('src', newSrc);
            $('.thumbnail').removeClass('active');
            $(this).addClass('active');
        });

        $('.thumbnail').first().addClass('active');
    }

    toggleFavorite(productId) {
        const index = this.favorites.indexOf(productId);
        if (index > -1) {
            this.favorites.splice(index, 1);
            this.showToast('Removed from favorites', 'info');
        } else {
            this.favorites.push(productId);
            this.showToast('Added to favorites', 'success');
        }
        
        this.saveToStorage('favorites', this.favorites);
        this.updateCounts();
        this.updateProductButtons(productId);
    }

    toggleWishlist(productId) {
        const index = this.wishlist.indexOf(productId);
        if (index > -1) {
            this.wishlist.splice(index, 1);
            this.showToast('Removed from wishlist', 'info');
        } else {
            this.wishlist.push(productId);
            this.showToast('Added to wishlist', 'success');
        }
        
        this.saveToStorage('wishlist', this.wishlist);
        this.updateCounts();
        this.updateProductButtons(productId);
    }

    toggleCompare(productId) {
        const index = this.compareList.indexOf(productId);
        if (index > -1) {
            this.compareList.splice(index, 1);
            this.showToast('Removed from comparison', 'info');
        } else {
            if (this.compareList.length >= 4) {
                this.showToast('Maximum 4 products can be compared', 'warning');
                return;
            }
            this.compareList.push(productId);
            this.showToast('Added to comparison', 'success');
        }
        
        this.saveToStorage('compareList', this.compareList);
        this.updateCounts();
        this.updateProductButtons(productId);
    }

    addToCart(productId, quantity = 1) {
        const product = this.products.find(p => p.id === productId);
        if (!product || !product.inStock) {
            this.showToast('Product is out of stock', 'warning');
            return;
        }
        
        const existingItem = this.cart.find(item => item.productId === productId);
        
        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            this.cart.push({ productId, quantity });
        }
        
        this.saveToStorage('cart', this.cart);
        this.updateCounts();
        this.showToast('Added to cart', 'success');
    }

    updateCartQuantity(productId, action) {
        const item = this.cart.find(item => item.productId === productId);
        if (!item) return;

        if (action === 'increase') {
            item.quantity++;
        } else if (action === 'decrease') {
            item.quantity--;
            if (item.quantity <= 0) {
                this.removeFromCart(productId);
                return;
            }
        }

        this.saveToStorage('cart', this.cart);
        this.updateCounts();
        this.displayCart();
    }

    removeFromCart(productId) {
        this.cart = this.cart.filter(item => item.productId !== productId);
        this.saveToStorage('cart', this.cart);
        this.updateCounts();
        this.displayCart();
        this.showToast('Removed from cart', 'info');
    }

    displayCart() {
        const container = $('#cart-content');
        
        if (this.cart.length === 0) {
            container.html(`
                <div class="empty-state">
                    <i class="bi bi-cart-x"></i>
                    <h4>Your cart is empty</h4>
                    <p>Add some products to get started</p>
                    <button class="btn btn-primary" onclick="flipMart.showView('home')">
                        Continue Shopping
                    </button>
                </div>
            `);
            return;
        }

        let cartHTML = '<div class="row">';
        let total = 0;
        let subtotal = 0;

        // Cart items
        cartHTML += '<div class="col-lg-8">';
        this.cart.forEach(item => {
            const product = this.products.find(p => p.id === item.productId);
            if (!product) return;

            const itemTotal = product.price * item.quantity;
            subtotal += itemTotal;

            cartHTML += `
                <div class="cart-item">
                    <div class="row align-items-center">
                        <div class="col-md-2">
                            <img src="${product.images[0]}" class="cart-item-image" alt="${product.name}">
                        </div>
                        <div class="col-md-4">
                            <h5>${product.name}</h5>
                            <p class="text-muted mb-1">${product.brand}</p>
                            <div class="rating-section">
                                <span class="rating-stars">${this.generateStars(product.rating)}</span>
                                <span class="rating-value">${product.rating}</span>
                            </div>
                        </div>
                        <div class="col-md-2">
                            <div class="quantity-controls">
                                <button class="quantity-btn" data-product-id="${product.id}" data-action="decrease">
                                    <i class="bi bi-dash"></i>
                                </button>
                                <span class="mx-2 fw-bold">${item.quantity}</span>
                                <button class="quantity-btn" data-product-id="${product.id}" data-action="increase">
                                    <i class="bi bi-plus"></i>
                                </button>
                            </div>
                        </div>
                        <div class="col-md-2">
                            <div class="fw-bold">₹${itemTotal.toLocaleString('en-IN')}</div>
                            <div class="small text-muted">₹${product.price.toLocaleString('en-IN')} each</div>
                        </div>
                        <div class="col-md-2">
                            <button class="btn btn-outline-danger btn-sm remove-from-cart" data-product-id="${product.id}">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });
        cartHTML += '</div>';

        // Cart summary
        const tax = subtotal * 0.18; // 18% GST
        const shipping = subtotal > 10000 ? 0 : 100;
        total = subtotal + tax + shipping;

        cartHTML += `
            <div class="col-lg-4">
                <div class="cart-summary">
                    <h4 class="mb-3">Order Summary</h4>
                    <div class="d-flex justify-content-between mb-2">
                        <span>Subtotal (${this.cart.reduce((sum, item) => sum + item.quantity, 0)} items):</span>
                        <span>₹${subtotal.toLocaleString('en-IN')}</span>
                    </div>
                    <div class="d-flex justify-content-between mb-2">
                        <span>GST (18%):</span>
                        <span>₹${tax.toLocaleString('en-IN')}</span>
                    </div>
                    <div class="d-flex justify-content-between mb-2">
                        <span>Shipping:</span>
                        <span>${shipping === 0 ? 'FREE' : '₹' + shipping}</span>
                    </div>
                    <hr>
                    <div class="d-flex justify-content-between mb-3 fw-bold fs-5">
                        <span>Total:</span>
                        <span>₹${total.toLocaleString('en-IN')}</span>
                    </div>
                    <button class="btn btn-success w-100 mb-2" id="generate-bill">
                        <i class="bi bi-receipt me-2"></i>Generate Bill
                    </button>
                    <button class="btn btn-outline-primary w-100 mb-2" onclick="flipMart.showContactModal()">
                        <i class="bi bi-telephone me-2"></i>Contact Shop
                    </button>
                    <div class="small text-muted text-center">
                        ${shipping === 0 ? '🎉 Free shipping on orders above ₹10,000' : 'Free shipping on orders above ₹10,000'}
                    </div>
                </div>
            </div>
        `;

        cartHTML += '</div>';
        container.html(cartHTML);
    }

    displayWishlist() {
        const container = $('#wishlist-content');
        
        if (this.wishlist.length === 0) {
            container.html(`
                <div class="col-12">
                    <div class="empty-state">
                        <i class="bi bi-bookmark"></i>
                        <h4>Your wishlist is empty</h4>
                        <p>Save products for later by adding them to your wishlist</p>
                        <button class="btn btn-primary" onclick="flipMart.showView('home')">
                            Browse Products
                        </button>
                    </div>
                </div>
            `);
            return;
        }

        container.empty();
        this.wishlist.forEach(productId => {
            const product = this.products.find(p => p.id === productId);
            if (product) {
                const productCard = this.createProductCard(product);
                container.append(productCard);
            }
        });
    }

    displayFavorites() {
        const container = $('#favorites-content');
        
        if (this.favorites.length === 0) {
            container.html(`
                <div class="col-12">
                    <div class="empty-state">
                        <i class="bi bi-heart"></i>
                        <h4>No favorites yet</h4>
                        <p>Add products to your favorites to see them here</p>
                        <button class="btn btn-primary" onclick="flipMart.showView('home')">
                            Browse Products
                        </button>
                    </div>
                </div>
            `);
            return;
        }

        container.empty();
        this.favorites.forEach(productId => {
            const product = this.products.find(p => p.id === productId);
            if (product) {
                const productCard = this.createProductCard(product);
                container.append(productCard);
            }
        });
    }

    displayComparison() {
        const container = $('#compare-content');
        
        if (this.compareList.length === 0) {
            container.html(`
                <div class="empty-state">
                    <i class="bi bi-arrow-left-right"></i>
                    <h4>No products to compare</h4>
                    <p>Add products to comparison to see them here</p>
                    <button class="btn btn-primary" onclick="flipMart.showView('home')">
                        Browse Products
                    </button>
                </div>
            `);
            return;
        }

        const compareProducts = this.compareList.map(id => 
            this.products.find(p => p.id === id)
        ).filter(Boolean);

        let comparisonHTML = `
            <div class="table-responsive">
                <table class="comparison-table table">
                    <thead>
                        <tr>
                            <th>Feature</th>
                            ${compareProducts.map(product => `<th>${product.name}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><strong>Image</strong></td>
                            ${compareProducts.map(product => 
                                `<td><img src="${product.images[0]}" class="product-image-compare" alt="${product.name}"></td>`
                            ).join('')}
                        </tr>
                        <tr>
                            <td><strong>Brand</strong></td>
                            ${compareProducts.map(product => `<td>${product.brand}</td>`).join('')}
                        </tr>
                        <tr>
                            <td><strong>Price</strong></td>
                            ${compareProducts.map(product => `<td class="fw-bold text-success">₹${product.price.toLocaleString('en-IN')}</td>`).join('')}
                        </tr>
                        <tr>
                            <td><strong>Rating</strong></td>
                            ${compareProducts.map(product => 
                                `<td>${this.generateStars(product.rating)} ${product.rating}</td>`
                            ).join('')}
                        </tr>
                        <tr>
                            <td><strong>Reviews</strong></td>
                            ${compareProducts.map(product => `<td>${product.reviews} reviews</td>`).join('')}
                        </tr>
        `;

        // Add specification comparisons
        const allSpecs = new Set();
        compareProducts.forEach(product => {
            Object.keys(product.specifications).forEach(spec => allSpecs.add(spec));
        });

        allSpecs.forEach(spec => {
            comparisonHTML += `
                <tr>
                    <td><strong>${spec}</strong></td>
                    ${compareProducts.map(product => 
                        `<td>${product.specifications[spec] || 'N/A'}</td>`
                    ).join('')}
                </tr>
            `;
        });

        comparisonHTML += `
                        <tr>
                            <td><strong>Actions</strong></td>
                            ${compareProducts.map(product => 
                                `<td>
                                    <button class="btn btn-primary btn-sm btn-cart me-2" data-product-id="${product.id}">
                                        <i class="bi bi-cart-plus"></i> Add to Cart
                                    </button>
                                    <button class="btn btn-outline-danger btn-sm" onclick="flipMart.toggleCompare('${product.id}')">
                                        <i class="bi bi-trash"></i> Remove
                                    </button>
                                </td>`
                            ).join('')}
                        </tr>
                    </tbody>
                </table>
            </div>
        `;

        container.html(comparisonHTML);
    }

    generateBill() {
        if (this.cart.length === 0) {
            this.showToast('Cart is empty', 'warning');
            return;
        }

        let billHTML = '';
        let subtotal = 0;

        // Bill header
        billHTML += `
            <div class="text-center mb-4">
                <h3 class="text-primary">FlipMart</h3>
                <p class="mb-0">Invoice #FM${Date.now()}</p>
                <p class="text-muted">${new Date().toLocaleDateString('en-IN')}</p>
            </div>
            <div class="table-responsive">
                <table class="table">
                    <thead class="table-primary">
                        <tr>
                            <th>Product</th>
                            <th>Price</th>
                            <th>Qty</th>
                            <th>Total</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        // Bill items
        this.cart.forEach(item => {
            const product = this.products.find(p => p.id === item.productId);
            if (!product) return;

            const itemTotal = product.price * item.quantity;
            subtotal += itemTotal;

            billHTML += `
                <tr>
                    <td>
                        <div class="d-flex align-items-center">
                            <img src="${product.images[0]}" width="50" height="50" class="me-3 rounded" alt="${product.name}">
                            <div>
                                <div class="fw-bold">${product.name}</div>
                                <small class="text-muted">${product.brand}</small>
                            </div>
                        </div>
                    </td>
                    <td>₹${product.price.toLocaleString('en-IN')}</td>
                    <td>${item.quantity}</td>
                    <td>₹${itemTotal.toLocaleString('en-IN')}</td>
                </tr>
            `;
        });

        // Bill summary
        const tax = subtotal * 0.18;
        const shipping = subtotal > 10000 ? 0 : 100;
        const total = subtotal + tax + shipping;

        billHTML += `
                    </tbody>
                </table>
            </div>
            <div class="row">
                <div class="col-md-6 offset-md-6">
                    <table class="table">
                        <tr>
                            <td>Subtotal:</td>
                            <td class="text-end">₹${subtotal.toLocaleString('en-IN')}</td>
                        </tr>
                        <tr>
                            <td>GST (18%):</td>
                            <td class="text-end">₹${tax.toLocaleString('en-IN')}</td>
                        </tr>
                        <tr>
                            <td>Shipping:</td>
                            <td class="text-end">${shipping === 0 ? 'FREE' : '₹' + shipping}</td>
                        </tr>
                        <tr class="table-primary">
                            <td class="fw-bold">Grand Total:</td>
                            <td class="text-end fw-bold">₹${total.toLocaleString('en-IN')}</td>
                        </tr>
                    </table>
                </div>
            </div>
        `;

        $('#bill-content').html(billHTML);
        const billModal = new bootstrap.Modal($('#billModal')[0]);
        billModal.show();
    }

    placeOrder() {
        // Simulate order placement
        this.cart = [];
        this.saveToStorage('cart', this.cart);
        this.updateCounts();
        
        const billModal = bootstrap.Modal.getInstance($('#billModal')[0]);
        billModal.hide();
        
        this.showToast('Order placed successfully! 🎉', 'success');
        this.showView('home');
    }

    showContactModal() {
        const contactModal = new bootstrap.Modal($('#contactModal')[0]);
        contactModal.show();
    }

    showImageGallery(imageSrc) {
        const modalContent = `
            <div id="imageCarousel" class="carousel slide" data-bs-ride="carousel">
                <div class="carousel-inner">
                    ${this.currentProduct.images.map((img, index) => `
                        <div class="carousel-item ${img === imageSrc ? 'active' : ''}">
                            <img src="${img}" class="d-block w-100" alt="${this.currentProduct.name}" style="max-height: 500px; object-fit: contain;">
                        </div>
                    `).join('')}
                </div>
                <button class="carousel-control-prev" type="button" data-bs-target="#imageCarousel" data-bs-slide="prev">
                    <span class="carousel-control-prev-icon"></span>
                </button>
                <button class="carousel-control-next" type="button" data-bs-target="#imageCarousel" data-bs-slide="next">
                    <span class="carousel-control-next-icon"></span>
                </button>
            </div>
        `;
        
        $('#images-modal-content').html(modalContent);
        const imagesModal = new bootstrap.Modal($('#imagesModal')[0]);
        imagesModal.show();
    }

    updateProductButtons(productId) {
        const isFavorite = this.favorites.includes(productId);
        const inWishlist = this.wishlist.includes(productId);
        const inCompare = this.compareList.includes(productId);

        $(`.btn-favorite[data-product-id="${productId}"]`).each(function() {
            $(this).toggleClass('active', isFavorite);
            $(this).find('i').removeClass('bi-heart bi-heart-fill').addClass(isFavorite ? 'bi-heart-fill' : 'bi-heart');
            $(this).html(`<i class="bi bi-heart${isFavorite ? '-fill' : ''}"></i>${$(this).text().includes('Add to') || $(this).text().includes('Remove from') ? ' ' + (isFavorite ? 'Remove from' : 'Add to') + ' Favorites' : ''}`);
        });

        $(`.btn-wishlist[data-product-id="${productId}"]`).each(function() {
            $(this).toggleClass('active', inWishlist);
            $(this).find('i').removeClass('bi-bookmark bi-bookmark-fill').addClass(inWishlist ? 'bi-bookmark-fill' : 'bi-bookmark');
            if ($(this).text().includes('Add to') || $(this).text().includes('Remove from')) {
                $(this).html(`<i class="bi bi-bookmark${inWishlist ? '-fill' : ''}"></i> ${inWishlist ? 'Remove from' : 'Add to'} Wishlist`);
            }
        });

        $(`.btn-compare[data-product-id="${productId}"]`).each(function() {
            $(this).toggleClass('active', inCompare);
            if ($(this).text().includes('Add to') || $(this).text().includes('Remove from')) {
                $(this).html(`<i class="bi bi-arrow-left-right"></i> ${inCompare ? 'Remove from' : 'Add to'} Compare`);
            }
        });
    }

    updateCounts() {
        $('#cart-count').text(this.cart.reduce((sum, item) => sum + item.quantity, 0));
        $('#favorites-count').text(this.favorites.length);
        $('#wishlist-count').text(this.wishlist.length);
        $('#compare-count').text(this.compareList.length);
    }

    saveToStorage(key, data) {
        localStorage.setItem(key, JSON.stringify(data));
    }

    loadFromStorage(key) {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    }

    showToast(message, type = 'info') {
        const toastColors = {
            success: 'text-bg-success',
            error: 'text-bg-danger',
            warning: 'text-bg-warning',
            info: 'text-bg-info'
        };

        // Create toast container if it doesn't exist
        if (!$('.toast-container').length) {
            $('body').append('<div class="toast-container"></div>');
        }

        const toast = $(`
            <div class="toast ${toastColors[type]} show" role="alert">
                <div class="toast-header">
                    <i class="bi bi-${type === 'success' ? 'check-circle' : type === 'error' ? 'x-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'} me-2"></i>
                    <strong class="me-auto">${type.charAt(0).toUpperCase() + type.slice(1)}</strong>
                    <button type="button" class="btn-close" data-bs-dismiss="toast"></button>
                </div>
                <div class="toast-body">
                    ${message}
                </div>
            </div>
        `);

        $('.toast-container').append(toast);
        const bsToast = new bootstrap.Toast(toast[0], { delay: 3000 });
        bsToast.show();

        toast[0].addEventListener('hidden.bs.toast', () => {
            toast.remove();
        });
    }
}

// Global functions
window.scrollToProducts = function() {
    document.getElementById('products-section').scrollIntoView({ behavior: 'smooth' });
};

// Initialize the application
let flipMart;
$(document).ready(() => {
    flipMart = new FlipMart();
    
    // Add some loading effects
    $('.product-card').addClass('skeleton');
    setTimeout(() => {
        $('.product-card').removeClass('skeleton');
    }, 1000);
});