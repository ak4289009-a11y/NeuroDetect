import os
from typing import Optional, Tuple
from app.core.config import settings

# Attempt importing supabase client
try:
    from supabase import create_client, Client
    HAS_SUPABASE_CLIENT = True
except ImportError:
    HAS_SUPABASE_CLIENT = False


class SupabaseStorageService:
    def __init__(self):
        self.url = settings.SUPABASE_URL
        self.key = settings.SUPABASE_SERVICE_ROLE_KEY
        self.bucket_name = settings.SUPABASE_BUCKET_NAME # "NeuroDetect Org"
        self.client: Optional[Client] = None

        if HAS_SUPABASE_CLIENT and self.url and self.key and not self.url.startswith("YOUR_"):
            try:
                self.client = create_client(self.url, self.key)
                print(f"[Supabase Storage] Initialized client connected to '{self.url}' (Bucket: '{self.bucket_name}')")
            except Exception as e:
                print(f"[Supabase Storage Warning] Client init failed: {e}")

    @property
    def is_configured(self) -> bool:
        return self.client is not None

    def upload_mri_scan(
        self,
        patient_id: int,
        scan_id: int,
        local_file_path: str,
        file_extension: str
    ) -> Tuple[str, str]:
        """
        Uploads MRI scan to private Supabase Storage bucket 'NeuroDetect Org'.
        Storage Path Format: PAT-{patient_id}/MRI-{scan_id}{file_extension}
        (e.g., PAT-1001/MRI-0001.png)

        Returns tuple: (storage_path, local_or_signed_access_url)
        """
        clean_ext = file_extension.lower()
        if not clean_ext.startswith("."):
            clean_ext = f".{clean_ext}"

        formatted_scan_id = f"{scan_id:04d}" if isinstance(scan_id, int) else str(scan_id)
        storage_path = f"PAT-{patient_id}/MRI-{formatted_scan_id}{clean_ext}"
        mime_type = "image/jpeg" if clean_ext in [".jpg", ".jpeg"] else "image/png"

        if self.is_configured:
            try:
                with open(local_file_path, "rb") as f:
                    file_data = f.read()

                # Upload file to private bucket
                res = self.client.storage.from_(self.bucket_name).upload(
                    path=storage_path,
                    file=file_data,
                    file_options={"content-type": mime_type, "x-upsert": "true"}
                )
                print(f"[Supabase Storage] Successfully uploaded scan to '{self.bucket_name}/{storage_path}'")
                
                # Generate short-lived signed URL for private access (600 seconds = 10 minutes)
                signed_res = self.client.storage.from_(self.bucket_name).create_signed_url(
                    path=storage_path,
                    expires_in=600
                )
                signed_url = signed_res.get("signedURL") or signed_res.get("signedUrl") or storage_path
                return storage_path, signed_url
            except Exception as e:
                print(f"[Supabase Storage Upload Error] Failed to upload to Supabase: {e}. Falling back to local storage path.")

        # Development Fallback
        relative_local_path = f"/uploads/mri/{os.path.basename(local_file_path)}"
        return storage_path, relative_local_path

    def get_signed_mri_url(self, storage_path: str, expires_in: int = 600) -> str:
        """
        Generates short-lived signed URL for private bucket file access after FastAPI authorization check.
        Never calls get_public_url(). Default expiration: 10 minutes (600s).
        """
        if self.is_configured and storage_path and storage_path.startswith("PAT-"):
            try:
                signed_res = self.client.storage.from_(self.bucket_name).create_signed_url(
                    path=storage_path,
                    expires_in=expires_in
                )
                signed_url = signed_res.get("signedURL") or signed_res.get("signedUrl")
                if signed_url:
                    return signed_url
            except Exception as e:
                print(f"[Supabase Storage Signed URL Error] Failed to create signed URL for '{storage_path}': {e}")

        # Fallback to backend proxied endpoint URL
        return f"/api/v1/scans/file?storage_path={storage_path}"

    def download_mri_bytes(self, storage_path: str, local_fallback_path: Optional[str] = None) -> bytes:
        """
        Downloads MRI file binary bytes for backend processing (DenseNet121 inference or PDF building).
        """
        if self.is_configured and storage_path and storage_path.startswith("PAT-"):
            try:
                res = self.client.storage.from_(self.bucket_name).download(storage_path)
                if res:
                    return res
            except Exception as e:
                print(f"[Supabase Storage Download Error] Failed to download '{storage_path}': {e}")

        if local_fallback_path and os.path.exists(local_fallback_path):
            with open(local_fallback_path, "rb") as f:
                return f.read()

        raise FileNotFoundError(f"MRI object bytes for '{storage_path}' could not be retrieved.")


supabase_storage = SupabaseStorageService()
