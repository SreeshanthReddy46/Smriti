import os
import sys
import tempfile
import pytest

# Add parent directory to sys.path to allow imports of backend files
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from analyzer import scan_directory

@pytest.fixture
def temp_workspace():
    """
    Creates a temporary workspace directory structure with some text and ignored files.
    """
    with tempfile.TemporaryDirectory() as tmpdir:
        # Create a Python file
        src_dir = os.path.join(tmpdir, "src")
        os.makedirs(src_dir)
        py_file = os.path.join(src_dir, "app.py")
        with open(py_file, "w", encoding="utf-8") as f:
            f.write("def hello():\n    print('world')\n") # 2 lines

        # Create a packages file indicating framework
        req_file = os.path.join(tmpdir, "requirements.txt")
        with open(req_file, "w", encoding="utf-8") as f:
            f.write("fastapi==0.100.0\npytest==7.0.0\n") # 2 lines

        # Create an ignored folder
        node_modules = os.path.join(tmpdir, "node_modules")
        os.makedirs(node_modules)
        ignored_js = os.path.join(node_modules, "index.js")
        with open(ignored_js, "w", encoding="utf-8") as f:
            f.write("console.log('ignored');\n")

        yield tmpdir

def test_scan_directory(temp_workspace):
    """
    Verifies that scan_directory extracts stats and folder tree correctly,
    skipping ignored paths.
    """
    result = scan_directory(temp_workspace)

    assert result["name"] == os.path.basename(temp_workspace)
    assert result["framework"] == "FastAPI"
    assert "Python" in result["languages"]
    
    # 2 files counted: src/app.py and requirements.txt (node_modules/index.js is ignored)
    assert result["total_files"] == 2
    
    # Total lines: 2 (app.py) + 2 (requirements.txt) = 4 lines
    assert result["total_lines"] == 4

    # Verify file tree structure
    tree = result["file_tree"]
    assert tree["type"] == "directory"
    
    children_names = [child["name"] for child in tree["children"]]
    assert "src" in children_names
    assert "requirements.txt" in children_names
    assert "node_modules" not in children_names # Node modules must be pruned
