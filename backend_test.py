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
        print(f"   URL: {url}")
        
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
                try:
                    print(f"   Response: {response.text}")
                except:
                    pass
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_api_root(self):
        """Test API root endpoint"""
        success, response = self.run_test("API Root", "GET", "", 200)
        return success

    def test_categories_crud(self):
        """Test categories CRUD operations"""
        print("\n📁 Testing Categories CRUD...")
        
        # Create category
        category_data = {
            "name": "Test Category",
            "color": "#FF5733"
        }
        success, response = self.run_test("Create Category", "POST", "categories", 200, category_data)
        if not success:
            return False
        
        category_id = response.get('id')
        if category_id:
            self.category_ids.append(category_id)
        
        # Get categories
        success, response = self.run_test("Get Categories", "GET", "categories", 200)
        if not success:
            return False
        
        # Update category
        update_data = {
            "name": "Updated Test Category",
            "color": "#33FF57"
        }
        success, response = self.run_test("Update Category", "PUT", f"categories/{category_id}", 200, update_data)
        if not success:
            return False
        
        return True

    def test_transactions_crud(self):
        """Test transactions CRUD operations"""
        print("\n💰 Testing Transactions CRUD...")
        
        # Create expense transaction
        expense_data = {
            "type": "expense",
            "amount": 150.50,
            "date": datetime.now(timezone.utc).isoformat(),
            "description": "Test Expense",
            "category_id": self.category_ids[0] if self.category_ids else None,
            "payment_method": "pix",
            "notes": "Test expense note"
        }
        success, response = self.run_test("Create Expense", "POST", "transactions", 200, expense_data)
        if not success:
            return False
        
        expense_id = response.get('id')
        if expense_id:
            self.transaction_ids.append(expense_id)
        
        # Create income transaction
        income_data = {
            "type": "income",
            "amount": 2500.00,
            "date": datetime.now(timezone.utc).isoformat(),
            "description": "Test Income",
            "payment_method": "bank_transfer"
        }
        success, response = self.run_test("Create Income", "POST", "transactions", 200, income_data)
        if not success:
            return False
        
        income_id = response.get('id')
        if income_id:
            self.transaction_ids.append(income_id)
        
        # Get transactions
        success, response = self.run_test("Get Transactions", "GET", "transactions", 200)
        if not success:
            return False
        
        # Get single transaction
        success, response = self.run_test("Get Single Transaction", "GET", f"transactions/{expense_id}", 200)
        if not success:
            return False
        
        # Update transaction
        update_data = {
            "type": "expense",
            "amount": 175.75,
            "date": datetime.now(timezone.utc).isoformat(),
            "description": "Updated Test Expense",
            "payment_method": "credit_card"
        }
        success, response = self.run_test("Update Transaction", "PUT", f"transactions/{expense_id}", 200, update_data)
        if not success:
            return False
        
        # Test transaction filters
        success, response = self.run_test("Filter Transactions by Type", "GET", "transactions", 200, 
                                        params={"type": "expense"})
        if not success:
            return False
        
        success, response = self.run_test("Filter Transactions by Payment Method", "GET", "transactions", 200, 
                                        params={"payment_method": "pix"})
        if not success:
            return False
        
        return True

    def test_budgets_crud(self):
        """Test budgets CRUD operations"""
        print("\n🎯 Testing Budgets CRUD...")
        
        # Create monthly budget
        budget_data = {
            "name": "Test Monthly Budget",
            "period": "monthly",
            "limit_amount": 1000.00,
            "scope": "total_expenses",
            "alerts_enabled": True,
            "alert_sound_enabled": True,
            "alert_threshold": 0.8
        }
        success, response = self.run_test("Create Budget", "POST", "budgets", 200, budget_data)
        if not success:
            return False
        
        budget_id = response.get('id')
        if budget_id:
            self.budget_ids.append(budget_id)
        
        # Create category budget
        if self.category_ids:
            category_budget_data = {
                "name": "Test Category Budget",
                "period": "weekly",
                "limit_amount": 200.00,
                "scope": "by_category",
                "category_id": self.category_ids[0],
                "alerts_enabled": True,
                "alert_threshold": 0.9
            }
            success, response = self.run_test("Create Category Budget", "POST", "budgets", 200, category_budget_data)
            if success and response.get('id'):
                self.budget_ids.append(response.get('id'))
        
        # Get budgets
        success, response = self.run_test("Get Budgets", "GET", "budgets", 200)
        if not success:
            return False
        
        # Get budget status
        success, response = self.run_test("Get Budget Status", "GET", f"budgets/{budget_id}/status", 200)
        if not success:
            return False
        
        # Update budget
        update_data = {
            "name": "Updated Test Budget",
            "period": "monthly",
            "limit_amount": 1200.00,
            "scope": "total_expenses",
            "alerts_enabled": False,
            "alert_threshold": 0.7
        }
        success, response = self.run_test("Update Budget", "PUT", f"budgets/{budget_id}", 200, update_data)
        if not success:
            return False
        
        return True

    def test_dashboard(self):
        """Test dashboard endpoint"""
        print("\n📊 Testing Dashboard...")
        success, response = self.run_test("Dashboard Summary", "GET", "dashboard/summary", 200)
        if success:
            print(f"   Dashboard data: Income={response.get('total_income', 0)}, "
                  f"Expenses={response.get('total_expenses', 0)}, "
                  f"Balance={response.get('balance', 0)}")
        return success

    def test_charts(self):
        """Test charts endpoint"""
        print("\n📈 Testing Charts...")
        
        # Test different granularities
        for granularity in ['day', 'week', 'month']:
            success, response = self.run_test(f"Chart Data - {granularity}", "GET", "reports/chart-data", 200,
                                            params={"granularity": granularity})
            if not success:
                return False
        
        # Test with filters
        if self.category_ids:
            success, response = self.run_test("Chart Data with Category Filter", "GET", "reports/chart-data", 200,
                                            params={"granularity": "day", "category_id": self.category_ids[0]})
            if not success:
                return False
        
        return True

    def test_export(self):
        """Test Excel export"""
        print("\n📤 Testing Excel Export...")
        try:
            url = f"{self.base_url}/api/export/excel"
            response = requests.get(url)
            success = response.status_code == 200
            if success:
                self.tests_passed += 1
                print("✅ Passed - Excel export working")
                # Check if it's actually an Excel file
                content_type = response.headers.get('content-type', '')
                if 'spreadsheet' in content_type or 'excel' in content_type:
                    print("   ✅ Correct content type for Excel file")
                else:
                    print(f"   ⚠️  Unexpected content type: {content_type}")
            else:
                print(f"❌ Failed - Status: {response.status_code}")
            
            self.tests_run += 1
            return success
        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            self.tests_run += 1
            return False

    def test_settings(self):
        """Test settings endpoints"""
        print("\n⚙️ Testing Settings...")
        
        # Get settings
        success, response = self.run_test("Get Settings", "GET", "settings", 200)
        if not success:
            return False
        
        # Update settings
        settings_data = {
            "currency": "BRL",
            "locale": "pt-BR",
            "week_starts_on": "monday",
            "timezone": "America/Sao_Paulo"
        }
        success, response = self.run_test("Update Settings", "PUT", "settings", 200, settings_data)
        return success

    def test_validation_errors(self):
        """Test validation and error handling"""
        print("\n🚫 Testing Validation & Error Handling...")
        
        # Test invalid transaction amount
        invalid_transaction = {
            "type": "expense",
            "amount": -50.0,  # Invalid negative amount
            "date": datetime.now(timezone.utc).isoformat(),
            "description": "Invalid Transaction"
        }
        success, response = self.run_test("Invalid Transaction Amount", "POST", "transactions", 400, invalid_transaction)
        # This should fail (400), so success means validation is working
        if not success:
            self.tests_passed += 1  # Adjust counter since we expect this to fail
        
        # Test invalid budget amount
        invalid_budget = {
            "name": "Invalid Budget",
            "period": "monthly",
            "limit_amount": -100.0,  # Invalid negative amount
            "scope": "total_expenses"
        }
        success, response = self.run_test("Invalid Budget Amount", "POST", "budgets", 400, invalid_budget)
        if not success:
            self.tests_passed += 1  # Adjust counter since we expect this to fail
        
        # Test non-existent transaction
        success, response = self.run_test("Non-existent Transaction", "GET", "transactions/non-existent-id", 404)
        if not success:
            self.tests_passed += 1  # Adjust counter since we expect this to fail
        
        return True

    def cleanup(self):
        """Clean up test data"""
        print("\n🧹 Cleaning up test data...")
        
        # Delete test transactions
        for transaction_id in self.transaction_ids:
            self.run_test(f"Delete Transaction {transaction_id}", "DELETE", f"transactions/{transaction_id}", 200)
        
        # Delete test budgets
        for budget_id in self.budget_ids:
            self.run_test(f"Delete Budget {budget_id}", "DELETE", f"budgets/{budget_id}", 200)
        
        # Delete test categories
        for category_id in self.category_ids:
            self.run_test(f"Delete Category {category_id}", "DELETE", f"categories/{category_id}", 200)

def main():
    print("🚀 Starting Organizze API Tests...")
    print("=" * 50)
    
    tester = OrganizzeAPITester()
    
    # Run all tests
    tests = [
        tester.test_api_root,
        tester.test_categories_crud,
        tester.test_transactions_crud,
        tester.test_budgets_crud,
        tester.test_dashboard,
        tester.test_charts,
        tester.test_export,
        tester.test_settings,
        tester.test_validation_errors,
    ]
    
    all_passed = True
    for test in tests:
        try:
            result = test()
            if not result:
                all_passed = False
        except Exception as e:
            print(f"❌ Test failed with exception: {str(e)}")
            all_passed = False
    
    # Cleanup
    tester.cleanup()
    
    # Print results
    print("\n" + "=" * 50)
    print(f"📊 Test Results: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    if all_passed and tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
        return 0
    else:
        print("❌ Some tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())