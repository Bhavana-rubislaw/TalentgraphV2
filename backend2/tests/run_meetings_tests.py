"""
Test Runner for All Meetings Tab Tests
Runs comprehensive test suite for the meetings functionality
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import subprocess
import time

def run_test_file(test_file, description):
    """Run a test file and report results"""
    print("\n" + "🚀" * 35)
    print(f"RUNNING: {description}")
    print("🚀" * 35 + "\n")
    
    try:
        result = subprocess.run(
            [sys.executable, test_file],
            cwd=Path(__file__).parent.parent,
            capture_output=False,
            text=True
        )
        
        if result.returncode == 0:
            print(f"\n✅ {description} - PASSED")
            return True
        else:
            print(f"\n⚠️  {description} - COMPLETED WITH ISSUES")
            return False
            
    except Exception as e:
        print(f"\n❌ {description} - FAILED: {e}")
        return False

def main():
    """Run all meeting tests"""
    print("\n" + "=" * 70)
    print("MEETINGS TAB - COMPREHENSIVE TEST SUITE")
    print("=" * 70)
    print(f"Start Time: {time.strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 70 + "\n")
    
    tests_dir = Path(__file__).parent
    
    # Test configuration
    tests = [
        {
            "file": tests_dir / "test_meetings_integration.py",
            "name": "Integration Tests",
            "description": "Database integrity and workflow validation"
        },
        {
            "file": tests_dir / "test_meetings_recruiter_ui.py",
            "name": "UI Functional Tests",
            "description": "Recruiter portal UI simulation"
        },
        {
            "file": tests_dir / "test_meetings_endpoints.py",
            "name": "API Endpoint Tests",
            "description": "REST API endpoint validation"
        }
    ]
    
    results = {}
    
    for test in tests:
        if test["file"].exists():
            success = run_test_file(str(test["file"]), test["name"])
            results[test["name"]] = success
            time.sleep(1)  # Brief pause between tests
        else:
            print(f"⚠️  Test file not found: {test['file']}")
            results[test["name"]] = False
    
    # Summary
    print("\n" + "=" * 70)
    print("TEST SUITE SUMMARY")
    print("=" * 70)
    
    total = len(results)
    passed = sum(1 for v in results.values() if v)
    failed = total - passed
    
    for test_name, success in results.items():
        status = "✅ PASSED" if success else "❌ FAILED"
        print(f"{status:12} | {test_name}")
    
    print("=" * 70)
    print(f"Total: {total} | Passed: {passed} | Failed: {failed}")
    
    if failed == 0:
        print("\n🎉 ALL TESTS PASSED! 🎉")
    else:
        print(f"\n⚠️  {failed} test suite(s) had issues")
    
    print("=" * 70)
    print(f"End Time: {time.strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 70 + "\n")

if __name__ == "__main__":
    main()
