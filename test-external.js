// External JavaScript test file
console.log('External JavaScript loaded');

// Simple test functions
function testSimpleFunction() {
  alert('Simple function works!');
  document.getElementById('output').innerHTML += '<p>Simple function called</p>';
}

function viewProject(projectId) {
  alert(`View project called with: ${projectId}`);
  document.getElementById('output').innerHTML += `<p>View project called with: ${projectId}</p>`;
}

function downloadFile(fileName) {
  alert(`Download file called with: ${fileName}`);
  document.getElementById('output').innerHTML += `<p>Download file called with: ${fileName}</p>`;
}

// Wait for DOM to load
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM loaded, setting up event listeners');
  
  // Add event listeners
  document.getElementById('directBtn').addEventListener('click', function() {
    alert('Direct button clicked!');
    document.getElementById('output').innerHTML += '<p>Direct button clicked</p>';
  });
  
  document.getElementById('simpleBtn').addEventListener('click', function() {
    testSimpleFunction();
  });
  
  document.getElementById('projectBtn').addEventListener('click', function() {
    viewProject('test-project');
  });
  
  document.getElementById('downloadBtn').addEventListener('click', function() {
    downloadFile('test-file.pdf');
  });
  
  console.log('Event listeners attached');
  document.getElementById('output').innerHTML = '<p>JavaScript loaded and event listeners attached</p>';
});

console.log('testSimpleFunction:', typeof testSimpleFunction);
console.log('viewProject:', typeof viewProject);
console.log('downloadFile:', typeof downloadFile);
