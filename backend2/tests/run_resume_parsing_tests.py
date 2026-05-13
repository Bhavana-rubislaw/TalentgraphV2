"""
Quick Test Runner for Resume Parsing Feature
Run specific test suites or all tests for resume parsing
"""
import subprocess
import sys
from pathlib import Path

def run_command(cmd, description):
    """Run a command and print results"""
    print(f"\n{'='*70}")
    print(f"Running: {description}")
    print(f"{'='*70}\n")
    
    result = subprocess.run(cmd, shell=True, capture_output=False, text=True)
    
    if result.returncode == 0:
        print(f"\n✅ {description} - PASSED")
    else:
        print(f"\n❌ {description} - FAILED")
    
    return result.returncode


def main():
    """Main test runner"""
    print("""
    ╔════════════════════════════════════════════════════════════════╗
    ║        Resume Parsing Feature - Test Suite Runner             ║
    ╚════════════════════════════════════════════════════════════════╝
    """)
    
    # Change to backend directory
    backend_dir = Path(__file__).parent.parent
    
    test_suites = {
        "1": {
            "name": "All Resume Parsing Tests",
            "cmd": f"cd {backend_dir} && pytest tests/test_resume_parsing.py -v"
        },
        "2": {
            "name": "Unit Tests Only (Service)",
            "cmd": f"cd {backend_dir} && pytest tests/test_resume_parsing.py::TestResumeParserService -v"
        },
        "3": {
            "name": "API Tests Only",
            "cmd": f"cd {backend_dir} && pytest tests/test_resume_parsing.py::TestResumeParsingAPI -v"
        },
        "4": {
            "name": "Integration Tests Only",
            "cmd": f"cd {backend_dir} && pytest tests/test_resume_parsing.py::TestResumeParsingIntegration -v"
        },
        "5": {
            "name": "Quick Smoke Test (Fast tests only)",
            "cmd": f"cd {backend_dir} && pytest tests/test_resume_parsing.py -v -k 'basic or validation' -x"
        },
        "6": {
            "name": "All Tests with Coverage Report",
            "cmd": f"cd {backend_dir} && pytest tests/test_resume_parsing.py -v --cov=app.services.resume_parser --cov=app.routers.candidates --cov-report=term-missing"
        },
    }
    
    # Display menu
    print("\nAvailable Test Suites:")
    print("-" * 70)
    for key, suite in test_suites.items():
        print(f"  {key}. {suite['name']}")
    print("  0. Run ALL tests in sequence")
    print("  q. Quit")
    print("-" * 70)
    
    # Get user choice
    choice = input("\nSelect test suite to run (0-6 or q): ").strip()
    
    if choice.lower() == 'q':
        print("\n👋 Exiting...")
        return 0
    
    # Validate Python environment
    print("\n🔍 Checking environment...")
    try:
        import pytest
        print(f"✅ pytest found: {pytest.__version__}")
    except ImportError:
        print("❌ pytest not found. Installing...")
        subprocess.run("pip install pytest pytest-cov", shell=True)
    
    # Run selected test suite
    if choice == "0":
        # Run all test suites
        print("\n🚀 Running ALL test suites sequentially...\n")
        failed = []
        for key, suite in test_suites.items():
            if key != "6":  # Skip coverage for all tests
                returncode = run_command(suite["cmd"], suite["name"])
                if returncode != 0:
                    failed.append(suite["name"])
        
        # Summary
        print(f"\n{'='*70}")
        print("TEST SUMMARY")
        print(f"{'='*70}")
        if failed:
            print(f"❌ {len(failed)} test suite(s) failed:")
            for name in failed:
                print(f"   - {name}")
            return 1
        else:
            print("✅ All test suites passed!")
            return 0
    
    elif choice in test_suites:
        suite = test_suites[choice]
        returncode = run_command(suite["cmd"], suite["name"])
        return returncode
    
    else:
        print(f"\n❌ Invalid choice: {choice}")
        return 1


if __name__ == "__main__":
    try:
        exit_code = main()
        sys.exit(exit_code)
    except KeyboardInterrupt:
        print("\n\n⚠️  Tests interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ Error running tests: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
