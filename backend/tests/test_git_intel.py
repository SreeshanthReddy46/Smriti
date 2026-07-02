import os
import sys
import tempfile
import pytest
import json
from git import Repo

# Add parent directory to sys.path to allow imports of backend files
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from git_intel import scan_git_history

@pytest.fixture
def temp_git_repo():
    """
    Creates a temporary Git repository, adds a file, configures mock user, and commits it.
    """
    with tempfile.TemporaryDirectory() as tmpdir:
        # Initialize Git repository
        repo = Repo.init(tmpdir)
        
        # Write local repository git configurations (to avoid failing if machine has no global git config)
        with repo.config_writer() as writer:
            writer.set_value("user", "name", "Test Developer")
            writer.set_value("user", "email", "dev@example.com")
            
        # Create a file
        test_file = os.path.join(tmpdir, "auth_helper.py")
        with open(test_file, "w") as f:
            f.write("# Authentication module\n")
            
        # Add and commit
        repo.index.add(["auth_helper.py"])
        repo.index.commit("feat: add authentication helper\n\nTODO: Implement JWT token expiry validation.")
        
        yield tmpdir
        repo.close()

def test_git_scan_history(temp_git_repo):
    """
    Verifies that git commits are correctly scanned and intent/stats are parsed.
    """
    commits = scan_git_history(temp_git_repo)
    
    assert len(commits) == 1
    commit_data = commits[0]
    
    # Verify commit details
    assert "Test Developer" in commit_data["author"]
    assert "dev@example.com" in commit_data["author"]
    assert commit_data["summary"] == "feat: add authentication helper"
    assert commit_data["intent"] == "New Feature"
    
    # Verify changed files parsing
    changed_files = json.loads(commit_data["files_changed"])
    assert "auth_helper.py" in changed_files
    
    # Verify affected features auto-detection
    features = json.loads(commit_data["affected_features"])
    assert "Authentication" in features
    
    # Verify remaining work extraction
    assert "TODO: Implement JWT token expiry validation." in commit_data["remaining_work"]

def test_git_scan_non_existent():
    """
    Verifies scanner fails gracefully on a non-existent path.
    """
    commits = scan_git_history("non_existent_folder_xyz_123")
    assert commits == []
