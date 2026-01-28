// Admin Panel JavaScript
class AdminPanel {
    constructor() {
        this.API_BASE_URL = 'http://localhost:5000/api';
        this.token = localStorage.getItem('adminToken');
        this.currentAdmin = null;
        this.currentSection = 'dashboard';
        
        this.init();
    }
    
    init() {
        this.checkAuth();
        this.bindEvents();
        
        if (this.token) {
            this.loadDashboard();
        }
    }
    
    // Authentication Methods
    checkAuth() {
        if (this.token) {
            this.verifyToken();
        } else {
            this.showLoginScreen();
        }
    }
    
    async verifyToken() {
        try {
            const response = await fetch(`${this.API_BASE_URL}/auth/verify`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.currentAdmin = data.admin;
                this.showDashboard();
                this.updateAdminInfo();
            } else {
                this.showLoginScreen();
            }
        } catch (error) {
            console.error('Token verification failed:', error);
            this.showLoginScreen();
        }
    }
    
    async login(email, password) {
        try {
            const response = await fetch(`${this.API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                this.token = data.token;
                this.currentAdmin = data.admin;
                localStorage.setItem('adminToken', this.token);
                this.showDashboard();
                this.updateAdminInfo();
                this.loadDashboard();
                this.showMessage('লগইন সফল!', 'success');
            } else {
                this.showMessage(data.message || 'লগইন ব্যর্থ', 'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showMessage('লগইন করতে সমস্যা হয়েছে', 'error');
        }
    }
    
    logout() {
        this.token = null;
        this.currentAdmin = null;
        localStorage.removeItem('adminToken');
        this.showLoginScreen();
    }
    
    // UI Management
    showLoginScreen() {
        document.getElementById('loginScreen').style.display = 'flex';
        document.getElementById('dashboard').style.display = 'none';
    }
    
    showDashboard() {
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('dashboard').style.display = 'flex';
    }
    
    showMessage(message, type) {
        const messageDiv = document.getElementById('loginMessage');
        messageDiv.textContent = message;
        messageDiv.className = `message ${type}`;
        
        if (type === 'success') {
            setTimeout(() => {
                messageDiv.textContent = '';
                messageDiv.className = 'message';
            }, 3000);
        }
    }
    
    updateAdminInfo() {
        if (this.currentAdmin) {
            document.getElementById('adminName').textContent = this.currentAdmin.username;
        }
    }
    
    // Navigation
    switchSection(sectionId) {
        // Hide all sections
        document.querySelectorAll('.section').forEach(section => {
            section.classList.remove('active');
        });
        
        // Remove active class from all nav items
        document.querySelectorAll('.sidebar-nav li').forEach(item => {
            item.classList.remove('active');
        });
        
        // Show selected section
        document.getElementById(`${sectionId}Section`).classList.add('active');
        
        // Add active class to selected nav item
        document.querySelector(`.sidebar-nav li[data-section="${sectionId}"]`).classList.add('active');
        
        // Update current section title
        document.getElementById('currentSection').textContent = 
            document.querySelector(`.sidebar-nav li[data-section="${sectionId}"]`).querySelector('span').textContent;
        
        this.currentSection = sectionId;
        
        // Load section data
        this.loadSectionData(sectionId);
    }
    
    // Data Loading
    async loadDashboard() {
        try {
            // Load stats
            const [ordersResponse, booksResponse] = await Promise.all([
                fetch(`${this.API_BASE_URL}/orders`, {
                    headers: {
                        'Authorization': `Bearer ${this.token}`
                    }
                }),
                fetch(`${this.API_BASE_URL}/books`, {
                    headers: {
                        'Authorization': `Bearer ${this.token}`
                    }
                })
            ]);
            
            if (ordersResponse.ok && booksResponse.ok) {
                const orders = await ordersResponse.json();
                const books = await booksResponse.json();
                
                // Update stats
                this.updateDashboardStats(orders, books);
                
                // Load recent orders
                this.loadRecentOrders(orders.slice(0, 5));
            }
        } catch (error) {
            console.error('Dashboard load error:', error);
        }
    }
    
    updateDashboardStats(orders, books) {
        // Calculate totals
        const totalOrders = orders.length;
        const totalRevenue = orders.reduce((sum, order) => sum + order.totalAmount, 0);
        const totalBooksSold = orders.reduce((sum, order) => {
            return sum + order.books.reduce((bookSum, book) => bookSum + book.quantity, 0);
        }, 0);
        
        // Get unique customers
        const uniqueCustomers = new Set(orders.map(order => order.customer.email));
        const totalCustomers = uniqueCustomers.size;
        
        // Update DOM
        document.getElementById('totalOrders').textContent = totalOrders;
        document.getElementById('totalRevenue').textContent = `৳${totalRevenue}`;
        document.getElementById('totalBooks').textContent = totalBooksSold;
        document.getElementById('totalCustomers').textContent = totalCustomers;
    }
    
    loadRecentOrders(orders) {
        const tbody = document.querySelector('#recentOrdersTable tbody');
        tbody.innerHTML = '';
        
        orders.forEach(order => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${order.orderId}</td>
                <td>${order.customer.name}</td>
                <td>৳${order.totalAmount}</td>
                <td><span class="status-badge status-${order.orderStatus}">${order.orderStatus}</span></td>
                <td>${new Date(order.createdAt).toLocaleDateString('bn-BD')}</td>
                <td>
                    <button class="btn btn-small btn-primary view-order" data-id="${order._id}">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }
    
    async loadSectionData(sectionId) {
        switch (sectionId) {
            case 'orders':
                await this.loadOrders();
                break;
            case 'books':
                await this.loadBooks();
                break;
            case 'customers':
                await this.loadCustomers();
                break;
            case 'analytics':
                await this.loadAnalytics();
                break;
        }
    }
    
    async loadOrders() {
        try {
            const response = await fetch(`${this.API_BASE_URL}/orders`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            
            if (response.ok) {
                const orders = await response.json();
                this.renderOrdersTable(orders);
            }
        } catch (error) {
            console.error('Orders load error:', error);
        }
    }
    
    renderOrdersTable(orders) {
        const tbody = document.querySelector('#ordersTable tbody');
        tbody.innerHTML = '';
        
        orders.forEach(order => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${order.orderId}</td>
                <td>${order.customer.name}</td>
                <td>${order.customer.phone}</td>
                <td>${order.books.length} বই</td>
                <td>৳${order.totalAmount}</td>
                <td><span class="status-badge status-${order.orderStatus}">${order.orderStatus}</span></td>
                <td>${new Date(order.createdAt).toLocaleDateString('bn-BD')}</td>
                <td>
                    <button class="btn btn-small btn-primary view-order" data-id="${order._id}">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-small btn-secondary update-status" data-id="${order._id}">
                        <i class="fas fa-edit"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }
    
    async loadBooks() {
        try {
            const response = await fetch(`${this.API_BASE_URL}/books`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            
            if (response.ok) {
                const books = await response.json();
                this.renderBooksTable(books);
            }
        } catch (error) {
            console.error('Books load error:', error);
        }
    }
    
    renderBooksTable(books) {
        const tbody = document.querySelector('#booksTable tbody');
        tbody.innerHTML = '';
        
        books.forEach(book => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>
                    ${book.images && book.images[0] ? 
                        `<img src="${book.images[0]}" alt="${book.title}" style="width: 50px; height: 50px; object-fit: cover;">` : 
                        '<i class="fas fa-book" style="font-size: 1.5rem; color: #666;"></i>'
                    }
                </td>
                <td>${book.title}</td>
                <td>${book.author}</td>
                <td>৳${book.discountPrice || book.price}</td>
                <td>${book.stock}</td>
                <td>
                    <span class="status-badge ${book.isAvailable ? 'status-delivered' : 'status-cancelled'}">
                        ${book.isAvailable ? 'Available' : 'Not Available'}
                    </span>
                </td>
                <td>
                    <button class="btn btn-small btn-primary edit-book" data-id="${book._id}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-small btn-secondary delete-book" data-id="${book._id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }
    
    async loadCustomers() {
        try {
            const response = await fetch(`${this.API_BASE_URL}/orders`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            
            if (response.ok) {
                const orders = await response.json();
                const customers = this.processCustomersData(orders);
                this.renderCustomersTable(customers);
            }
        } catch (error) {
            console.error('Customers load error:', error);
        }
    }
    
    processCustomersData(orders) {
        const customerMap = new Map();
        
        orders.forEach(order => {
            const email = order.customer.email;
            
            if (!customerMap.has(email)) {
                customerMap.set(email, {
                    name: order.customer.name,
                    email: order.customer.email,
                    phone: order.customer.phone,
                    city: order.customer.city,
                    totalOrders: 0,
                    totalSpent: 0,
                    lastOrder: null
                });
            }
            
            const customer = customerMap.get(email);
            customer.totalOrders++;
            customer.totalSpent += order.totalAmount;
            
            if (!customer.lastOrder || new Date(order.createdAt) > new Date(customer.lastOrder)) {
                customer.lastOrder = order.createdAt;
            }
        });
        
        return Array.from(customerMap.values());
    }
    
    renderCustomersTable(customers) {
        const tbody = document.querySelector('#customersTable tbody');
        tbody.innerHTML = '';
        
        customers.forEach(customer => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${customer.name}</td>
                <td>${customer.email}</td>
                <td>${customer.phone}</td>
                <td>${customer.city}</td>
                <td>${customer.totalOrders}</td>
                <td>৳${customer.totalSpent}</td>
                <td>${customer.lastOrder ? new Date(customer.lastOrder).toLocaleDateString('bn-BD') : 'N/A'}</td>
            `;
            tbody.appendChild(row);
        });
    }
    
    async loadAnalytics() {
        try {
            const response = await fetch(`${this.API_BASE_URL}/orders`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            
            if (response.ok) {
                const orders = await response.json();
                this.renderCharts(orders);
            }
        } catch (error) {
            console.error('Analytics load error:', error);
        }
    }
    
    renderCharts(orders) {
        // Sales Trend Chart
        const salesCtx = document.getElementById('salesChart').getContext('2d');
        
        // Group orders by month
        const monthlySales = {};
        orders.forEach(order => {
            const month = new Date(order.createdAt).toLocaleString('bn-BD', { month: 'short' });
            monthlySales[month] = (monthlySales[month] || 0) + order.totalAmount;
        });
        
        const salesChart = new Chart(salesCtx, {
            type: 'line',
            data: {
                labels: Object.keys(monthlySales),
                datasets: [{
                    label: 'বিক্রয় (৳)',
                    data: Object.values(monthlySales),
                    borderColor: '#3498db',
                    backgroundColor: 'rgba(52, 152, 219, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    }
                }
            }
        });
        
        // Order Status Chart
        const statusCtx = document.getElementById('statusChart').getContext('2d');
        
        const statusCounts = {
            'pending': 0,
            'processing': 0,
            'shipped': 0,
            'delivered': 0,
            'cancelled': 0
        };
        
        orders.forEach(order => {
            statusCounts[order.orderStatus]++;
        });
        
        const statusChart = new Chart(statusCtx, {
            type: 'doughnut',
            data: {
                labels: ['অপেক্ষমান', 'প্রসেসিং', 'শিপড', 'ডেলিভার্ড', 'বাতিল'],
                datasets: [{
                    data: Object.values(statusCounts),
                    backgroundColor: [
                        '#f39c12',
                        '#3498db',
                        '#9b59b6',
                        '#2ecc71',
                        '#e74c3c'
                    ]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top'
                    }
                }
            }
        });
    }
    
    // Book Management
    async saveBook(bookData) {
        try {
            const method = bookData._id ? 'PUT' : 'POST';
            const url = bookData._id ? 
                `${this.API_BASE_URL}/books/${bookData._id}` : 
                `${this.API_BASE_URL}/books`;
            
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify(bookData)
            });
            
            if (response.ok) {
                this.showMessage('বই সফলভাবে সেভ হয়েছে!', 'success');
                this.closeModal('bookModal');
                await this.loadBooks();
            } else {
                const data = await response.json();
                this.showMessage(data.message || 'বই সেভ করতে সমস্যা হয়েছে', 'error');
            }
        } catch (error) {
            console.error('Save book error:', error);
            this.showMessage('বই সেভ করতে সমস্যা হয়েছে', 'error');
        }
    }
    
    async deleteBook(bookId) {
        if (!confirm('আপনি কি এই বই ডিলিট করতে চান?')) return;
        
        try {
            const response = await fetch(`${this.API_BASE_URL}/books/${bookId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            
            if (response.ok) {
                this.showMessage('বই সফলভাবে ডিলিট হয়েছে!', 'success');
                await this.loadBooks();
            } else {
                const data = await response.json();
                this.showMessage(data.message || 'বই ডিলিট করতে সমস্যা হয়েছে', 'error');
            }
        } catch (error) {
            console.error('Delete book error:', error);
            this.showMessage('বই ডিলিট করতে সমস্যা হয়েছে', 'error');
        }
    }
    
    // Modal Management
    openModal(modalId, data = null) {
        const modal = document.getElementById(modalId);
        modal.style.display = 'flex';
        
        if (modalId === 'bookModal' && data) {
            this.populateBookForm(data);
        } else if (modalId === 'orderModal' && data) {
            this.populateOrderDetails(data);
        }
    }
    
    closeModal(modalId) {
        document.getElementById(modalId).style.display = 'none';
        
        if (modalId === 'bookModal') {
            document.getElementById('bookForm').reset();
            document.getElementById('bookId').value = '';
        }
    }
    
    populateBookForm(book) {
        document.getElementById('bookTitle').value = book.title || '';
        document.getElementById('bookAuthor').value = book.author || '';
        document.getElementById('bookPrice').value = book.price || '';
        document.getElementById('bookDiscount').value = book.discountPrice || '';
        document.getElementById('bookStock').value = book.stock || 0;
        document.getElementById('bookCategory').value = book.category || 'spiritual';
        document.getElementById('bookDescription').value = book.description || '';
        document.getElementById('bookFeatures').value = book.features ? book.features.join('\n') : '';
        document.getElementById('bookImages').value = book.images ? book.images.join(', ') : '';
        document.getElementById('bookStatus').value = book.isAvailable ? 'true' : 'false';
        document.getElementById('bookId').value = book._id || '';
        
        document.getElementById('modalTitle').textContent = book._id ? 'বই এডিট করুন' : 'নতুন বই যোগ করুন';
    }
    
    populateOrderDetails(order) {
        const contentDiv = document.getElementById('orderDetailsContent');
        
        let booksHtml = '';
        order.books.forEach(item => {
            booksHtml += `
                <div class="order-book-item">
                    <p><strong>বই:</strong> ${item.bookId.title || 'Book'}</p>
                    <p><strong>পরিমাণ:</strong> ${item.quantity}</p>
                    <p><strong>দাম:</strong> ৳${item.price}</p>
                </div>
            `;
        });
        
        contentDiv.innerHTML = `
            <div class="order-details-grid">
                <div class="order-info">
                    <h4>অর্ডার তথ্য</h4>
                    <p><strong>অর্ডার আইডি:</strong> ${order.orderId}</p>
                    <p><strong>তারিখ:</strong> ${new Date(order.createdAt).toLocaleString('bn-BD')}</p>
                    <p><strong>স্ট্যাটাস:</strong> <span class="status-badge status-${order.orderStatus}">${order.orderStatus}</span></p>
                    <p><strong>পেমেন্ট মেথড:</strong> ${order.paymentMethod}</p>
                    <p><strong>পেমেন্ট স্ট্যাটাস:</strong> ${order.paymentStatus}</p>
                    <p><strong>মোট Amount:</strong> ৳${order.totalAmount}</p>
                </div>
                
                <div class="customer-info">
                    <h4>গ্রাহক তথ্য</h4>
                    <p><strong>নাম:</strong> ${order.customer.name}</p>
                    <p><strong>ইমেইল:</strong> ${order.customer.email}</p>
                    <p><strong>ফোন:</strong> ${order.customer.phone}</p>
                    <p><strong>ঠিকানা:</strong> ${order.customer.address}</p>
                    <p><strong>শহর:</strong> ${order.customer.city}</p>
                    <p><strong>পোস্টাল কোড:</strong> ${order.customer.postalCode}</p>
                </div>
                
                <div class="books-info">
                    <h4>বইয়ের তালিকা</h4>
                    ${booksHtml}
                </div>
                
                ${order.notes ? `
                    <div class="order-notes">
                        <h4>বিশেষ নির্দেশনা</h4>
                        <p>${order.notes}</p>
                    </div>
                ` : ''}
            </div>
            
            <div class="order-actions" style="margin-top: 20px;">
                <select id="statusUpdateSelect">
                    <option value="pending" ${order.orderStatus === 'pending' ? 'selected' : ''}>অপেক্ষমান</option>
                    <option value="processing" ${order.orderStatus === 'processing' ? 'selected' : ''}>প্রসেসিং</option>
                    <option value="shipped" ${order.orderStatus === 'shipped' ? 'selected' : ''}>শিপড</option>
                    <option value="delivered" ${order.orderStatus === 'delivered' ? 'selected' : ''}>ডেলিভার্ড</option>
                    <option value="cancelled" ${order.orderStatus === 'cancelled' ? 'selected' : ''}>বাতিল</option>
                </select>
                <button id="updateStatusBtn" class="btn btn-primary" data-id="${order._id}">
                    স্ট্যাটাস আপডেট করুন
                </button>
            </div>
        `;
    }
    
    // Event Binding
    bindEvents() {
        // Login Form
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            this.login(email, password);
        });
        
        // Logout Button
        document.getElementById('logoutBtn').addEventListener('click', () => {
            this.logout();
        });
        
        // Navigation
        document.querySelectorAll('.sidebar-nav li').forEach(item => {
            item.addEventListener('click', (e) => {
                const section = e.currentTarget.dataset.section;
                this.switchSection(section);
            });
        });
        
        // Quick Actions
        document.querySelectorAll('.action-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.currentTarget.dataset.action;
                this.handleQuickAction(action);
            });
        });
        
        // Add Book Button
        document.getElementById('addBookBtn').addEventListener('click', () => {
            this.openModal('bookModal');
        });
        
        // Book Form Submission
        document.getElementById('bookForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleBookSubmit();
        });
        
        // Close Modal Buttons
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                if (modal) {
                    this.closeModal(modal.id);
                }
            });
        });
        
        // Window click to close modal
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeModal(e.target.id);
            }
        });
        
        // Orders table event delegation
        document.querySelector('#ordersTable tbody')?.addEventListener('click', (e) => {
            const target = e.target.closest('button');
            if (!target) return;
            
            const orderId = target.dataset.id;
            
            if (target.classList.contains('view-order')) {
                this.viewOrderDetails(orderId);
            } else if (target.classList.contains('update-status')) {
                this.updateOrderStatus(orderId);
            }
        });
        
        // Books table event delegation
        document.querySelector('#booksTable tbody')?.addEventListener('click', (e) => {
            const target = e.target.closest('button');
            if (!target) return;
            
            const bookId = target.dataset.id;
            
            if (target.classList.contains('edit-book')) {
                this.editBook(bookId);
            } else if (target.classList.contains('delete-book')) {
                this.deleteBook(bookId);
            }
        });
    }
    
    // Event Handlers
    handleQuickAction(action) {
        switch (action) {
            case 'addBook':
                this.openModal('bookModal');
                this.switchSection('books');
                break;
            case 'viewOrders':
                this.switchSection('orders');
                break;
            case 'updateStock':
                // Implement stock update functionality
                alert('স্টক আপডেট ফিচার শীঘ্রই আসছে!');
                break;
            case 'generateReport':
                // Implement report generation
                alert('রিপোর্ট জেনারেশন শীঘ্রই আসছে!');
                break;
        }
    }
    
    async handleBookSubmit() {
        const bookData = {
            title: document.getElementById('bookTitle').value,
            author: document.getElementById('bookAuthor').value,
            price: parseFloat(document.getElementById('bookPrice').value),
            stock: parseInt(document.getElementById('bookStock').value),
            category: document.getElementById('bookCategory').value,
            description: document.getElementById('bookDescription').value,
            isAvailable: document.getElementById('bookStatus').value === 'true'
        };
        
        const discountPrice = document.getElementById('bookDiscount').value;
        if (discountPrice) {
            bookData.discountPrice = parseFloat(discountPrice);
        }
        
        const features = document.getElementById('bookFeatures').value;
        if (features) {
            bookData.features = features.split('\n').filter(f => f.trim());
        }
        
        const images = document.getElementById('bookImages').value;
        if (images) {
            bookData.images = images.split(',').map(img => img.trim()).filter(img => img);
        }
        
        const bookId = document.getElementById('bookId').value;
        if (bookId) {
            bookData._id = bookId;
        }
        
        await this.saveBook(bookData);
    }
    
    async viewOrderDetails(orderId) {
        try {
            const response = await fetch(`${this.API_BASE_URL}/orders/${orderId}`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            
            if (response.ok) {
                const order = await response.json();
                this.openModal('orderModal', order);
            }
        } catch (error) {
            console.error('View order error:', error);
        }
    }
    
    async editBook(bookId) {
        try {
            const response = await fetch(`${this.API_BASE_URL}/books/${bookId}`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            
            if (response.ok) {
                const book = await response.json();
                this.openModal('bookModal', book);
            }
        } catch (error) {
            console.error('Edit book error:', error);
        }
    }
    
    async updateOrderStatus(orderId) {
        // Implement status update functionality
        alert('অর্ডার স্ট্যাটাস আপডেট ফিচার শীঘ্রই আসছে!');
    }
}

// Initialize Admin Panel when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.adminPanel = new AdminPanel();
});