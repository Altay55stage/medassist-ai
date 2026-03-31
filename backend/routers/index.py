from fastapi import APIRouter, UploadFile, File, HTTPException
import shutil
import os
from vectorstore.indexer import index_documents
from config import get_settings

router = APIRouter()
settings = get_settings()

@router.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    """
    Saves an uploaded PDF file and triggers the FAISS re-indexing.
    """
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Seuls les fichiers PDF sont supportés pour l'indexation.")
    
    # Ensure directory exists
    os.makedirs(settings.data_dir, exist_ok=True)
    file_path = os.path.join(settings.data_dir, file.filename)
    
    try:
        # Save file to local data/documents folder
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Trigger indexing
        index_documents(settings.data_dir)
        
        return {
            "status": "success",
            "filename": file.filename,
            "message": "Document indexé avec succès dans la base de connaissance."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de l'indexation: {str(e)}")

@router.post("/rebuild")
async def rebuild_index():
    """
    Manually triggers a full re-indexing of the data/documents folder.
    """
    try:
        index_documents(settings.data_dir)
        return {"status": "success", "message": "Index FAISS reconstruit avec succès."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")
