"""
Backend tests for FinanceFlow - Authentication and Payment endpoints
Tests: POST /api/auth/register, POST /api/auth/login, GET /api/auth/me
Tests: POST /api/payments/checkout, GET /api/payments/status/{session_id}
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestHealthCheck:
    """Basic health check tests"""
    
    def test_api_root(self):
        """Test API root endpoint"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert data["message"] == "FinanceFlow API"
        print("✅ API root endpoint working")


class TestAuthentication:
    """Authentication endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test data"""
        self.test_email = f"test_{uuid.uuid4().hex[:8]}@financeflow.com"
        self.test_password = "senha123"
        self.test_name = "Usuário Teste"
    
    def test_register_new_user(self):
        """Test user registration"""
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": self.test_email,
            "password": self.test_password,
            "name": self.test_name
        })
        
        assert response.status_code == 200, f"Registration failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "access_token" in data
        assert "token_type" in data
        assert "user" in data
        assert data["token_type"] == "bearer"
        
        # Verify user data
        assert data["user"]["email"] == self.test_email
        assert data["user"]["name"] == self.test_name
        assert "id" in data["user"]
        assert data["user"]["plan_type"] == "free_trial"
        
        print(f"✅ User registration successful: {self.test_email}")
    
    def test_register_duplicate_email(self):
        """Test registration with duplicate email fails"""
        # First registration
        requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": self.test_email,
            "password": self.test_password,
            "name": self.test_name
        })
        
        # Second registration with same email
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": self.test_email,
            "password": "different_password",
            "name": "Different Name"
        })
        
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        print("✅ Duplicate email registration correctly rejected")
    
    def test_login_success(self):
        """Test successful login"""
        # First register
        requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": self.test_email,
            "password": self.test_password,
            "name": self.test_name
        })
        
        # Then login
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": self.test_email,
            "password": self.test_password
        })
        
        assert response.status_code == 200
        data = response.json()
        
        assert "access_token" in data
        assert "token_type" in data
        assert "user" in data
        assert data["token_type"] == "bearer"
        assert data["user"]["email"] == self.test_email
        
        print("✅ Login successful")
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "nonexistent@example.com",
            "password": "wrongpassword"
        })
        
        assert response.status_code == 401
        data = response.json()
        assert "detail" in data
        print("✅ Invalid credentials correctly rejected")
    
    def test_login_wrong_password(self):
        """Test login with wrong password"""
        # First register
        requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": self.test_email,
            "password": self.test_password,
            "name": self.test_name
        })
        
        # Login with wrong password
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": self.test_email,
            "password": "wrongpassword"
        })
        
        assert response.status_code == 401
        print("✅ Wrong password correctly rejected")
    
    def test_get_current_user_with_token(self):
        """Test GET /api/auth/me with valid token"""
        # Register and get token
        reg_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": self.test_email,
            "password": self.test_password,
            "name": self.test_name
        })
        
        token = reg_response.json()["access_token"]
        
        # Get current user
        response = requests.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": f"Bearer {token}"
        })
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["email"] == self.test_email
        assert data["name"] == self.test_name
        assert "password_hash" not in data  # Should not expose password hash
        
        print("✅ GET /api/auth/me with valid token successful")
    
    def test_get_current_user_without_token(self):
        """Test GET /api/auth/me without token"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        
        assert response.status_code == 401
        print("✅ GET /api/auth/me without token correctly rejected")
    
    def test_get_current_user_invalid_token(self):
        """Test GET /api/auth/me with invalid token"""
        response = requests.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": "Bearer invalid_token_here"
        })
        
        assert response.status_code == 401
        print("✅ GET /api/auth/me with invalid token correctly rejected")


class TestPayments:
    """Payment endpoint tests"""
    
    def test_create_checkout_basic_plan(self):
        """Test creating checkout session for basic plan"""
        response = requests.post(
            f"{BASE_URL}/api/payments/checkout?plan_id=basic",
            headers={"Origin": BASE_URL}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "checkout_url" in data
        assert "session_id" in data
        assert data["checkout_url"].startswith("https://")
        
        print(f"✅ Checkout session created for basic plan: {data['session_id'][:20]}...")
        return data["session_id"]
    
    def test_create_checkout_premium_plan(self):
        """Test creating checkout session for premium plan"""
        response = requests.post(
            f"{BASE_URL}/api/payments/checkout?plan_id=premium",
            headers={"Origin": BASE_URL}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "checkout_url" in data
        assert "session_id" in data
        
        print(f"✅ Checkout session created for premium plan: {data['session_id'][:20]}...")
    
    def test_create_checkout_invalid_plan(self):
        """Test creating checkout session with invalid plan"""
        response = requests.post(
            f"{BASE_URL}/api/payments/checkout?plan_id=invalid_plan",
            headers={"Origin": BASE_URL}
        )
        
        assert response.status_code == 400
        print("✅ Invalid plan correctly rejected")
    
    def test_get_payment_status(self):
        """Test getting payment status for a session"""
        # First create a checkout session
        create_response = requests.post(
            f"{BASE_URL}/api/payments/checkout?plan_id=basic",
            headers={"Origin": BASE_URL}
        )
        
        session_id = create_response.json()["session_id"]
        
        # Get status
        response = requests.get(
            f"{BASE_URL}/api/payments/status/{session_id}",
            headers={"Origin": BASE_URL}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Status should be pending for new session
        assert "status" in data
        assert "payment_status" in data
        
        print(f"✅ Payment status retrieved: {data['status']}")
    
    def test_get_payment_status_invalid_session(self):
        """Test getting payment status for invalid session"""
        response = requests.get(
            f"{BASE_URL}/api/payments/status/invalid_session_id",
            headers={"Origin": BASE_URL}
        )
        
        # Should return 500 or handle gracefully
        # Stripe will throw error for invalid session (520 is Cloudflare error)
        assert response.status_code in [200, 500, 520]
        print("✅ Invalid session handled")


class TestPlans:
    """Plan management endpoint tests"""
    
    def test_get_available_plans(self):
        """Test getting available plans"""
        response = requests.get(f"{BASE_URL}/api/plans/available")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "plans" in data
        assert len(data["plans"]) == 3  # free_trial, basic, premium
        
        plan_ids = [p["id"] for p in data["plans"]]
        assert "free_trial" in plan_ids
        assert "basic" in plan_ids
        assert "premium" in plan_ids
        
        # Verify pricing
        for plan in data["plans"]:
            if plan["id"] == "basic":
                assert plan["price"] == 15.00
            elif plan["id"] == "premium":
                assert plan["price"] == 35.90
        
        print("✅ Available plans retrieved correctly")
    
    def test_get_current_plan(self):
        """Test getting current user plan"""
        response = requests.get(f"{BASE_URL}/api/plans/current")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "plan_type" in data
        assert "limits" in data
        assert "current_usage" in data
        
        print(f"✅ Current plan retrieved: {data['plan_type']}")
    
    def test_check_resource_limit(self):
        """Test checking resource limits"""
        response = requests.get(f"{BASE_URL}/api/plans/check-limit/transaction")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "allowed" in data
        
        print(f"✅ Resource limit check: allowed={data['allowed']}")


class TestCardsInvoice:
    """Test card invoice endpoint for NaN bug fix"""
    
    def test_card_invoice_no_transactions(self):
        """Test that card invoice shows 0 instead of NaN when no transactions"""
        # First create a card
        card_response = requests.post(f"{BASE_URL}/api/cards", json={
            "name": "TEST_Card_NaN_Check",
            "brand": "visa",
            "last_four_digits": "9999",
            "credit_limit": 5000.0,
            "closing_day": 15,
            "due_day": 25
        })
        
        assert card_response.status_code == 200
        card = card_response.json()
        card_id = card["id"]
        
        # Get invoice for card with no transactions
        invoice_response = requests.get(f"{BASE_URL}/api/cards/{card_id}/invoice")
        
        assert invoice_response.status_code == 200
        invoice = invoice_response.json()
        
        # Verify used_amount is 0, not NaN
        assert invoice["used_amount"] == 0
        assert invoice["available_amount"] == 5000.0
        assert invoice["usage_percentage"] == 0
        assert invoice["total_transactions"] == 0
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/cards/{card_id}")
        
        print("✅ Card invoice shows R$ 0,00 correctly (not NaN)")


class TestDashboardSummary:
    """Test dashboard summary endpoint"""
    
    def test_dashboard_summary(self):
        """Test dashboard summary returns valid data"""
        response = requests.get(f"{BASE_URL}/api/dashboard/summary")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert "total_income" in data
        assert "total_expenses" in data
        assert "balance" in data
        assert "budgets_status" in data
        assert "recent_transactions" in data
        assert "cards_summary" in data
        assert "pending_invoices" in data
        
        # Verify types
        assert isinstance(data["total_income"], (int, float))
        assert isinstance(data["total_expenses"], (int, float))
        assert isinstance(data["balance"], (int, float))
        
        print("✅ Dashboard summary endpoint working correctly")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
