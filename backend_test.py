import requests
import sys
import json
from datetime import datetime

class HostelAPITester:
    def __init__(self, base_url="https://9e2e7521-4020-427d-bd91-4b85200871d0.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.created_room_id = None
        self.created_user_id = None
        self.created_occupancy_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, params=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
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
                    response_data = response.json()
                    print(f"   Response: {json.dumps(response_data, indent=2)[:200]}...")
                    return True, response_data
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Error: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_dashboard_stats(self):
        """Test dashboard stats endpoint"""
        success, response = self.run_test(
            "Dashboard Stats",
            "GET",
            "dashboard/stats",
            200
        )
        return success

    def test_create_room(self):
        """Test room creation"""
        room_data = {
            "room_number": f"101-{datetime.now().strftime('%H%M%S')}",
            "room_type": "single",
            "capacity": 1,
            "floor": 1,
            "monthly_rent": 500.0,
            "amenities": ["WiFi", "AC"]
        }
        
        success, response = self.run_test(
            "Create Room",
            "POST",
            "rooms",
            200,
            data=room_data
        )
        
        if success and 'id' in response:
            self.created_room_id = response['id']
            print(f"   Created room ID: {self.created_room_id}")
        
        return success

    def test_get_rooms(self):
        """Test getting all rooms"""
        success, response = self.run_test(
            "Get All Rooms",
            "GET",
            "rooms",
            200
        )
        return success

    def test_get_room_by_id(self):
        """Test getting a specific room"""
        if not self.created_room_id:
            print("❌ Skipping - No room ID available")
            return False
            
        success, response = self.run_test(
            "Get Room by ID",
            "GET",
            f"rooms/{self.created_room_id}",
            200
        )
        return success

    def test_create_user(self):
        """Test user creation"""
        user_data = {
            "name": f"Test User {datetime.now().strftime('%H%M%S')}",
            "email": f"test{datetime.now().strftime('%H%M%S')}@example.com",
            "phone": "+1234567890",
            "role": "resident",
            "gender": "male",
            "emergency_contact": "+0987654321"
        }
        
        success, response = self.run_test(
            "Create User",
            "POST",
            "users",
            200,
            data=user_data
        )
        
        if success and 'id' in response:
            self.created_user_id = response['id']
            print(f"   Created user ID: {self.created_user_id}")
        
        return success

    def test_get_users(self):
        """Test getting all users"""
        success, response = self.run_test(
            "Get All Users",
            "GET",
            "users",
            200
        )
        return success

    def test_get_users_by_role(self):
        """Test getting users by role"""
        success, response = self.run_test(
            "Get Users by Role (resident)",
            "GET",
            "users",
            200,
            params={"role": "resident"}
        )
        return success

    def test_get_user_by_id(self):
        """Test getting a specific user"""
        if not self.created_user_id:
            print("❌ Skipping - No user ID available")
            return False
            
        success, response = self.run_test(
            "Get User by ID",
            "GET",
            f"users/{self.created_user_id}",
            200
        )
        return success

    def test_assign_room(self):
        """Test room assignment"""
        if not self.created_room_id or not self.created_user_id:
            print("❌ Skipping - Missing room or user ID")
            return False
            
        occupancy_data = {
            "room_id": self.created_room_id,
            "resident_id": self.created_user_id,
            "monthly_rent": 500.0
        }
        
        success, response = self.run_test(
            "Assign Room to User",
            "POST",
            "occupancies",
            200,
            data=occupancy_data
        )
        
        if success and 'id' in response:
            self.created_occupancy_id = response['id']
            print(f"   Created occupancy ID: {self.created_occupancy_id}")
        
        return success

    def test_update_room_status(self):
        """Test updating room status"""
        if not self.created_room_id:
            print("❌ Skipping - No room ID available")
            return False
            
        success, response = self.run_test(
            "Update Room Status",
            "PUT",
            f"rooms/{self.created_room_id}/status",
            200,
            data="maintenance"
        )
        return success

    def test_remove_occupancy(self):
        """Test removing occupancy"""
        if not self.created_occupancy_id:
            print("❌ Skipping - No occupancy ID available")
            return False
            
        success, response = self.run_test(
            "Remove Occupancy",
            "DELETE",
            f"occupancies/{self.created_occupancy_id}",
            200
        )
        return success

    def test_error_cases(self):
        """Test error handling"""
        print("\n🔍 Testing Error Cases...")
        
        # Test duplicate room number
        duplicate_room = {
            "room_number": "DUPLICATE_TEST",
            "room_type": "single",
            "capacity": 1,
            "floor": 1,
            "monthly_rent": 500.0
        }
        
        # Create first room
        self.run_test("Create Room (First)", "POST", "rooms", 200, data=duplicate_room)
        
        # Try to create duplicate
        success, _ = self.run_test("Create Duplicate Room", "POST", "rooms", 400, data=duplicate_room)
        
        # Test duplicate email
        duplicate_user = {
            "name": "Duplicate User",
            "email": "duplicate@test.com",
            "phone": "+1111111111",
            "role": "resident",
            "gender": "female",
            "emergency_contact": "+2222222222"
        }
        
        # Create first user
        self.run_test("Create User (First)", "POST", "users", 200, data=duplicate_user)
        
        # Try to create duplicate
        success, _ = self.run_test("Create Duplicate User", "POST", "users", 400, data=duplicate_user)
        
        # Test non-existent room
        success, _ = self.run_test("Get Non-existent Room", "GET", "rooms/non-existent-id", 404)
        
        # Test non-existent user
        success, _ = self.run_test("Get Non-existent User", "GET", "users/non-existent-id", 404)

def main():
    print("🏨 Starting Hostel Management API Tests")
    print("=" * 50)
    
    tester = HostelAPITester()
    
    # Test sequence
    test_results = []
    
    # Basic endpoint tests
    test_results.append(tester.test_dashboard_stats())
    test_results.append(tester.test_create_room())
    test_results.append(tester.test_get_rooms())
    test_results.append(tester.test_get_room_by_id())
    
    test_results.append(tester.test_create_user())
    test_results.append(tester.test_get_users())
    test_results.append(tester.test_get_users_by_role())
    test_results.append(tester.test_get_user_by_id())
    
    # Integration tests
    test_results.append(tester.test_assign_room())
    test_results.append(tester.test_update_room_status())
    
    # Verify room assignment worked by checking room again
    test_results.append(tester.test_get_room_by_id())
    
    # Cleanup test
    test_results.append(tester.test_remove_occupancy())
    
    # Error handling tests
    tester.test_error_cases()
    
    # Final stats check
    test_results.append(tester.test_dashboard_stats())
    
    # Print results
    print("\n" + "=" * 50)
    print(f"📊 Test Results: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
        return 0
    else:
        print(f"❌ {tester.tests_run - tester.tests_passed} tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())