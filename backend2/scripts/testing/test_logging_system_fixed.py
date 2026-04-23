#!/usr/bin/env python3
"""
Logging System Test Script
Tests the comprehensive logging system functionality
"""

import asyncio
import json
import logging
import time
from datetime import datetime
import sys
from pathlib import Path

# Add the app directory to the Python path
sys.path.insert(0, str(Path(__file__).parent / "app"))

try:
    from app.core.logging_config import setup_logging, get_logger, log_change
    from app.database import get_session, init_db
    from app.models import SystemLog
except ImportError as e:
    print(f"❌ Import error: {e}")
    print("Make sure you're running this from the backend2 directory")
    sys.exit(1)


def test_basic_logging():
    """Test basic logging functionality"""
    print("\\n🔍 Testing basic logging...")
    
    logger = get_logger("test_module")
    
    # Test different log levels
    logger.debug("This is a debug message")
    logger.info("This is an info message")
    logger.warning("This is a warning message")
    logger.error("This is an error message")
    
    print("✅ Basic logging test completed")


def test_structured_logging():
    """Test structured logging with metadata"""
    print("\\n🔍 Testing structured logging...")
    
    logger = get_logger("test_structured")
    
    # Test structured logging
    log_change(
        logger,
        action="test_create",
        entity_type="test_entity",
        entity_id="test_123",
        user_id="user_456",
        request_id="req_789",
        log_metadata={"test": True, "timestamp": datetime.now().isoformat()},
        message="Testing structured logging functionality"
    )
    
    print("✅ Structured logging test completed")


def test_database_logging():
    """Test database logging functionality"""
    print("\\n🔍 Testing database logging...")
    
    try:
        # Test database connection and log storage
        with next(get_session()) as session:
            # Create a test log entry directly
            test_log = SystemLog(
                timestamp=datetime.utcnow(),
                level="INFO",
                logger="test_db_logger",
                message="Database logging test",
                module="test_module",
                function="test_function",
                line_number=42,
                request_id="test_req_123",
                user_id=1,
                action="test",
                entity_type="test",
                entity_id="123",
                log_metadata=json.dumps({"test": "database_logging"})
            )
            
            session.add(test_log)
            session.commit()
            
            # Verify the log was stored
            stored_log = session.get(SystemLog, test_log.id)
            if stored_log:
                print(f"✅ Database logging test completed - Log ID: {stored_log.id}")
            else:
                print("❌ Database logging test failed - Log not stored")
                
    except Exception as e:
        print(f"❌ Database logging test failed: {e}")


def test_log_file_creation():
    """Test log file creation and rotation"""
    print("\\n🔍 Testing log file creation...")
    
    logs_dir = Path("logs")
    log_file = logs_dir / "talentgraph_v2.log"
    
    # Check if logs directory exists
    if logs_dir.exists():
        print(f"✅ Logs directory exists: {logs_dir}")
    else:
        print(f"❌ Logs directory missing: {logs_dir}")
    
    # Check if log file exists or gets created
    logger = get_logger("file_test")
    logger.info("Testing log file creation")
    
    time.sleep(1)  # Give it a moment to write
    
    if log_file.exists():
        file_size = log_file.stat().st_size
        print(f"✅ Log file exists: {log_file} ({file_size} bytes)")
        
        # Show last few lines
        try:
            with open(log_file, 'r') as f:
                lines = f.readlines()
                if lines:
                    print(f"📝 Latest log entry: {lines[-1].strip()}")
        except Exception as e:
            print(f"⚠️  Could not read log file: {e}")
    else:
        print(f"❌ Log file not created: {log_file}")


def test_performance():
    """Test logging performance"""
    print("\\n🔍 Testing logging performance...")
    
    logger = get_logger("performance_test")
    
    # Test logging performance
    num_logs = 1000
    start_time = time.time()
    
    for i in range(num_logs):
        log_change(
            logger,
            action="perf_test",
            entity_type="test",
            entity_id=str(i),
            log_metadata={"iteration": i, "batch": "performance_test"}
        )
    
    end_time = time.time()
    duration = end_time - start_time
    logs_per_second = num_logs / duration
    
    print(f"✅ Performance test completed:")
    print(f"   📊 {num_logs} logs in {duration:.2f}s")
    print(f"   📊 {logs_per_second:.2f} logs/second")
    
    if logs_per_second > 100:
        print("   🚀 Performance: Excellent")
    elif logs_per_second > 50:
        print("   ✅ Performance: Good")
    else:
        print("   ⚠️  Performance: Consider optimization")


def test_error_handling():
    """Test error handling and exception logging"""
    print("\\n🔍 Testing error handling...")
    
    logger = get_logger("error_test")
    
    try:
        # Intentionally cause an error
        result = 1 / 0
    except Exception as e:
        logger.error(
            "Intentional error for testing",
            extra={
                "action": "error_test",
                "entity_type": "test",
                "log_metadata": {"error_type": type(e).__name__}
            },
            exc_info=True
        )
    
    print("✅ Error handling test completed")


def show_system_info():
    """Show system information for debugging"""
    print("\\n📋 System Information:")
    print(f"   🐍 Python: {sys.version}")
    print(f"   📁 Working Directory: {Path.cwd()}")
    print(f"   🕐 Current Time: {datetime.now().isoformat()}")
    
    # Check for required files
    required_files = [
        "app/core/logging_config.py",
        "app/models.py",
        "app/database.py"
    ]
    
    print("   📋 Required Files:")
    for file_path in required_files:
        if Path(file_path).exists():
            print(f"      ✅ {file_path}")
        else:
            print(f"      ❌ {file_path} (missing)")


def main():
    """Run all logging tests"""
    print("🚀 TalentGraph V2 - Comprehensive Logging System Test")
    print("=" * 60)
    
    show_system_info()
    
    try:
        # Initialize the logging system
        print("\\n🔧 Initializing logging system...")
        setup_logging()
        print("✅ Logging system initialized")
        
        # Initialize database (if needed)
        try:
            init_db()
            print("✅ Database initialized")
        except Exception as e:
            print(f"⚠️  Database initialization warning: {e}")
        
        # Run tests
        test_basic_logging()
        test_structured_logging()
        test_log_file_creation()
        test_database_logging()
        test_performance()
        test_error_handling()
        
        print("\\n" + "=" * 60)
        print("🎉 All logging tests completed successfully!")
        print("\\n📋 Next Steps:")
        print("   1. Check the logs/talentgraph_v2.log file for file logging")
        print("   2. Check your database for SystemLog table entries")
        print("   3. Start your FastAPI server to test API endpoints")
        print("   4. Use the frontend logging dashboard at /admin/logs")
        
    except Exception as e:
        print(f"\\n❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    return True


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)