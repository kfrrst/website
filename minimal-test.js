// Minimal test functions
function viewProject(projectId) {
  console.log('viewProject called with:', projectId);
  alert(`View project: ${projectId}`);
}

function downloadFile(fileName) {
  console.log('downloadFile called with:', fileName);
  alert(`Download file: ${fileName}`);
}

function payInvoice(invoiceId) {
  console.log('payInvoice called with:', invoiceId);
  alert(`Pay invoice: ${invoiceId}`);
}

function viewInvoice(invoiceId) {
  console.log('viewInvoice called with:', invoiceId);
  alert(`View invoice: ${invoiceId}`);
}

function testFunction() {
  alert('Test function works!');
  return true;
}

// Make functions global
window.viewProject = viewProject;
window.downloadFile = downloadFile;
window.payInvoice = payInvoice;
window.viewInvoice = viewInvoice;
window.testFunction = testFunction;

console.log('Minimal functions loaded');
console.log('Function types:');
console.log('viewProject:', typeof window.viewProject);
console.log('downloadFile:', typeof window.downloadFile);
console.log('payInvoice:', typeof window.payInvoice);
console.log('viewInvoice:', typeof window.viewInvoice);
