const API_BASE_URL = "http://localhost:8000";

/**
 * Uploads a PDF file to the backend for FAISS indexing.
 * @param {File} file - The PDF file to upload.
 * @returns {Promise<Object>} - The JSON response from the backend.
 */
export async function uploadDocument(file) {
  const formData = new FormData();
  formData.append("file", file);

  try {
    const response = await fetch(`${API_BASE_URL}/index/upload`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || "Erreur lors de l'upload du document.");
    }

    return await response.json();
  } catch (error) {
    console.error("Upload failed:", error);
    throw error;
  }
}

/**
 * Manually triggers a rebuild of the database index.
 * @returns {Promise<Object>}
 */
export async function rebuildIndex() {
  const response = await fetch(`${API_BASE_URL}/index/rebuild`, {
    method: "POST",
  });
  return await response.json();
}
