import requests
import sys
from datetime import datetime, timezone
import json

class OrganizzeAPITester:
    def __init__(self, base_url="https://organizze-app.preview.emergentagent.com"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.created_ids = {
            'categories': [],
            'cards': [],
            'transactions': [],
            'budgets': [],
            'notifications': []
        }

    def run_test(self, name, method, endpoint, expected_status, data=None, params=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return True, response.json() if response.content else {}
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                if response.content:
                    try:
                        error_data = response.json()
                        print(f"   Error: {error_data}")
                    except:
                        print(f"   Response: {response.text[:200]}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_basic_endpoints(self):
        """Test basic API endpoints"""
        print("\n=== TESTING BASIC ENDPOINTS ===")
        
        # Test root endpoint
        success, _ = self.run_test("API Root", "GET", "", 200)
        
        # Test categories
        success, categories = self.run_test("Get Categories", "GET", "categories", 200)
        
        # Test cards
        success, cards = self.run_test("Get Cards", "GET", "cards", 200)
        
        # Test transactions
        success, transactions = self.run_test("Get Transactions", "GET", "transactions", 200)
        
        # Test budgets
        success, budgets = self.run_test("Get Budgets", "GET", "budgets", 200)
        
        # Test notifications
        success, notifications = self.run_test("Get Notifications", "GET", "notifications", 200)
        
        return success

    def test_cards_crud(self):
        """Test complete cards CRUD operations"""
        print("\n=== TESTING CARDS CRUD ===")
        
        # Create a new card
        card_data = {
            "name": "Test Card Visa",
            "brand": "visa",
            "last_four_digits": "1234",
            "credit_limit": 5000.0,
            "closing_day": 10,
            "due_day": 20,
            "active": True
        }
        
        success, card = self.run_test("Create Card", "POST", "cards", 200, card_data)
        if not success:
            return False
            
        card_id = card.get('id')
        if card_id:
            self.created_ids['cards'].append(card_id)
        
        # Get specific card
        success, _ = self.run_test("Get Card by ID", "GET", f"cards/{card_id}", 200)
        
        # Update card
        updated_data = {**card_data, "name": "Updated Test Card", "credit_limit": 6000.0}
        success, _ = self.run_test("Update Card", "PUT", f"cards/{card_id}", 200, updated_data)
        
        # Test card invoice
        success, invoice = self.run_test("Get Card Invoice", "GET", f"cards/{card_id}/invoice", 200)
        if success:
            print(f"   Invoice data: Used {invoice.get('used_amount', 0)}, Available {invoice.get('available_amount', 0)}")
        
        # Test card sync (mocked)
        success, sync_result = self.run_test("Sync Card", "POST", f"cards/{card_id}/sync", 200)
        if success:
            print(f"   Sync result: {sync_result.get('message', 'No message')}")
        
        return success

    def test_predictions(self):
        """Test predictions endpoint"""
        print("\n=== TESTING PREDICTIONS ===")
        
        success, predictions = self.run_test("Get Predictions", "GET", "predictions", 200, params={"months": 3})
        if success and predictions:
            pred_data = predictions.get('predictions', [])
            print(f"   Found {len(pred_data)} months of predictions")
            for pred in pred_data[:2]:  # Show first 2 months
                print(f"   - {pred.get('month_name', 'Unknown')}: {pred.get('predicted_total', 0)}")
        
        return success

    def test_notifications_crud(self):
        """Test notifications CRUD operations"""
        print("\n=== TESTING NOTIFICATIONS ===")
        
        # Get all notifications
        success, notifications = self.run_test("Get All Notifications", "GET", "notifications", 200)
        
        # Get unread notifications
        success, unread = self.run_test("Get Unread Notifications", "GET", "notifications", 200, params={"unread_only": True})
        if success:
            print(f"   Found {len(unread)} unread notifications")
        
        # If we have notifications, test mark as read and delete
        if notifications and len(notifications) > 0:
            notification_id = notifications[0]['id']
            
            # Mark as read
            success, _ = self.run_test("Mark Notification Read", "PUT", f"notifications/{notification_id}/read", 200)
            
            # Delete notification
            success, _ = self.run_test("Delete Notification", "DELETE", f"notifications/{notification_id}", 200)
        
        return success

    def test_pie_chart_reports(self):
        """Test pie chart reports"""
        print("\n=== TESTING PIE CHART REPORTS ===")
        
        # Test expenses by category
        success, pie_data = self.run_test("Pie Chart - Expenses by Category", "GET", "reports/pie-chart", 200, 
                                         params={"type": "expenses", "group_by": "category"})
        if success:
            data = pie_data.get('data', [])
            total = pie_data.get('total', 0)
            print(f"   Found {len(data)} categories, total: {total}")
        
        # Test expenses by payment method
        success, pie_data = self.run_test("Pie Chart - Expenses by Payment", "GET", "reports/pie-chart", 200,
                                         params={"type": "expenses", "group_by": "payment_method"})
        if success:
            data = pie_data.get('data', [])
            print(f"   Found {len(data)} payment methods")
        
        return success

    def test_transactions_with_cards(self):
        """Test transaction creation with credit card"""
        print("\n=== TESTING TRANSACTIONS WITH CARDS ===")
        
        # First ensure we have a card
        if not self.created_ids['cards']:
            print("   No cards available, skipping card transaction test")
            return True
        
        card_id = self.created_ids['cards'][0]
        
        # Create transaction with credit card
        transaction_data = {
            "type": "expense",
            "amount": 150.50,
            "date": datetime.now(timezone.utc).isoformat(),
            "description": "Test Credit Card Purchase",
            "payment_method": "credit_card",
            "card_id": card_id,
            "installments": 3
        }
        
        success, transaction = self.run_test("Create Credit Card Transaction", "POST", "transactions", 200, transaction_data)
        if success:
            transaction_id = transaction.get('id')
            if transaction_id:
                self.created_ids['transactions'].append(transaction_id)
                print(f"   Created transaction with {transaction.get('installments', 1)} installments")
        
        return success

    def test_dashboard_summary(self):
        """Test dashboard summary endpoint"""
        print("\n=== TESTING DASHBOARD SUMMARY ===")
        
        success, summary = self.run_test("Dashboard Summary", "GET", "dashboard/summary", 200)
        if success:
            print(f"   Income: {summary.get('total_income', 0)}")
            print(f"   Expenses: {summary.get('total_expenses', 0)}")
            print(f"   Balance: {summary.get('balance', 0)}")
            print(f"   Cards: {len(summary.get('cards_summary', []))}")
            print(f"   Pending invoices: {summary.get('pending_invoices', 0)}")
        
        return success

    def test_chart_data(self):
        """Test chart data endpoints"""
        print("\n=== TESTING CHART DATA ===")
        
        # Test basic chart data
        success, chart_data = self.run_test("Chart Data", "GET", "reports/chart-data", 200, 
                                           params={"granularity": "day"})
        if success:
            print(f"   Found {len(chart_data)} data points")
        
        return success

    def cleanup(self):
        """Clean up created test data"""
        print("\n=== CLEANUP ===")
        
        # Delete created transactions
        for transaction_id in self.created_ids['transactions']:
            self.run_test(f"Delete Transaction {transaction_id[:8]}", "DELETE", f"transactions/{transaction_id}", 200)
        
        # Deactivate created cards (soft delete)
        for card_id in self.created_ids['cards']:
            self.run_test(f"Delete Card {card_id[:8]}", "DELETE", f"cards/{card_id}", 200)

def main():
    print("🚀 Starting Organizze API Tests")
    print("=" * 50)
    
    tester = OrganizzeAPITester()
    
    try:
        # Run all tests
        tests = [
            tester.test_basic_endpoints,
            tester.test_cards_crud,
            tester.test_predictions,
            tester.test_notifications_crud,
            tester.test_pie_chart_reports,
            tester.test_transactions_with_cards,
            tester.test_dashboard_summary,
            tester.test_chart_data
        ]
        
        for test in tests:
            if not test():
                print(f"\n❌ Test {test.__name__} failed, continuing...")
        
        # Cleanup
        tester.cleanup()
        
    except KeyboardInterrupt:
        print("\n\n⚠️ Tests interrupted by user")
        tester.cleanup()
    
    # Print final results
    print(f"\n📊 FINAL RESULTS")
    print("=" * 50)
    print(f"Tests passed: {tester.tests_passed}/{tester.tests_run}")
    success_rate = (tester.tests_passed / tester.tests_run * 100) if tester.tests_run > 0 else 0
    print(f"Success rate: {success_rate:.1f}%")
    
    if success_rate >= 80:
        print("🎉 Backend tests mostly successful!")
        return 0
    else:
        print("⚠️ Backend has significant issues")
        return 1

if __name__ == "__main__":
    sys.exit(main())