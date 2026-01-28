// DOM Elements
const navMenu = document.querySelector('.nav-menu');
const hamburger = document.querySelector('.hamburger');
const orderForm = document.getElementById('orderForm');
const successModal = document.getElementById('successModal');
const closeModalBtn = document.querySelector('.close-modal');
const closeSuccessModalBtn = document.getElementById('closeSuccessModal');
const trackBtn = document.getElementById('trackBtn');
const trackResult = document.getElementById('trackResult');

// API Base URL - Change this to your backend URL
const API_BASE_URL = 'https://mrityu-o-tar-pore0.onrender.com';

// Mobile Menu Toggle
hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    navMenu.classList.toggle('active');
});

// Close mobile menu when clicking on a link
document.querySelectorAll('.nav-menu a').forEach(link => {
    link.addEventListener('click', () => {
        hamburger.classList.remove('active');
        navMenu.classList.remove('active');
    });
});

// Handle Order Form Submission
orderForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Get form data
    const formData = {
        customer: {
            name: document.getElementById('name').value,
            email: document.getElementById('email').value,
            phone: document.getElementById('phone').value,
            address: document.getElementById('address').value,
            city: document.getElementById('city').value,
            postalCode: document.getElementById('postalCode').value
        },
        books: [
            {
                bookId: '654321abcdef123456789012', // This should be your actual book ID
                quantity: parseInt(document.getElementById('quantity').value),
                price: 350 // Book price
            }
        ],
        paymentMethod: document.querySelector('input[name="paymentMethod"]:checked').value,
        notes: document.getElementById('notes').value
    };
    
    try {
        // Show loading state
        const submitBtn = orderForm.querySelector('.submit-btn');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'প্রসেসিং...';
        submitBtn.disabled = true;
        
        // Send order data to backend
        const response = await fetch(`${API_BASE_URL}/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Show success modal with order ID
            document.getElementById('orderIdDisplay').textContent = 
                `আপনার অর্ডার আইডি: ${data.order.orderId}`;
            successModal.style.display = 'flex';
            
            // Reset form
            orderForm.reset();
        } else {
            alert(`Error: ${data.message}`);
        }
    } catch (error) {
        alert('অর্ডার করতে সমস্যা হয়েছে। দয়া করে আবার চেষ্টা করুন।');
        console.error('Order error:', error);
    } finally {
        // Reset button state
        const submitBtn = orderForm.querySelector('.submit-btn');
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
});

// Handle Order Tracking
trackBtn.addEventListener('click', async () => {
    const orderId = document.getElementById('trackOrderId').value.trim();
    
    if (!orderId) {
        alert('অর্ডার আইডি লিখুন');
        return;
    }
    
    try {
        trackResult.innerHTML = '<p>লোড হচ্ছে...</p>';
        
        const response = await fetch(`${API_BASE_URL}/orders/track/${orderId}`);
        const data = await response.json();
        
        if (response.ok) {
            const order = data;
            const statusText = {
                'pending': 'অপেক্ষমান',
                'processing': 'প্রসেসিং',
                'shipped': 'শিপড',
                'delivered': 'ডেলিভার্ড',
                'cancelled': 'বাতিল'
            };
            
            const paymentStatusText = {
                'pending': 'অপেক্ষমান',
                'paid': 'পেইড',
                'failed': 'ব্যর্থ'
            };
            
            trackResult.innerHTML = `
                <div class="order-details">
                    <h3>অর্ডার ডিটেইলস</h3>
                    <p><strong>অর্ডার আইডি:</strong> ${order.orderId}</p>
                    <p><strong>গ্রাহকের নাম:</strong> ${order.customer.name}</p>
                    <p><strong>অর্ডার স্ট্যাটাস:</strong> <span class="status-${order.orderStatus}">${statusText[order.orderStatus]}</span></p>
                    <p><strong>পেমেন্ট স্ট্যাটাস:</strong> ${paymentStatusText[order.paymentStatus]}</p>
                    <p><strong>মোট Amount:</strong> ৳${order.totalAmount}</p>
                    <p><strong>অর্ডার তারিখ:</strong> ${new Date(order.createdAt).toLocaleDateString('bn-BD')}</p>
                </div>
            `;
        } else {
            trackResult.innerHTML = `<p class="error">${data.message}</p>`;
        }
    } catch (error) {
        trackResult.innerHTML = '<p class="error">ট্র্যাক করতে সমস্যা হয়েছে</p>';
        console.error('Tracking error:', error);
    }
});

// Modal Controls
closeModalBtn.addEventListener('click', () => {
    successModal.style.display = 'none';
});

closeSuccessModalBtn.addEventListener('click', () => {
    successModal.style.display = 'none';
});

window.addEventListener('click', (e) => {
    if (e.target === successModal) {
        successModal.style.display = 'none';
    }
});

// Smooth scrolling for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        
        const targetId = this.getAttribute('href');
        if (targetId === '#') return;
        
        const targetElement = document.querySelector(targetId);
        if (targetElement) {
            window.scrollTo({
                top: targetElement.offsetTop - 70,
                behavior: 'smooth'
            });
        }
    });
});

// Form validation
function validateForm() {
    const phone = document.getElementById('phone').value;
    const email = document.getElementById('email').value;
    
    // Phone validation (Bangladeshi format)
    const phoneRegex = /^01[3-9]\d{8}$/;
    if (!phoneRegex.test(phone)) {
        alert('সঠিক ফোন নম্বর লিখুন');
        return false;
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        alert('সঠিক ইমেইল ঠিকানা লিখুন');
        return false;
    }
    
    return true;
}

// Add validation to form
orderForm.addEventListener('submit', (e) => {
    if (!validateForm()) {
        e.preventDefault();
    }
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    console.log('মৃত্যু ও তার পরে ওয়েবসাইট লোড হয়েছে');
});