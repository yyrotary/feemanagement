import React, { useState, useRef } from 'react';
import styles from './CSVUploader.module.css';

interface FileUploaderProps {
  onUploadComplete?: (result: any) => void;
}

const FileUploader: React.FC<FileUploaderProps> = ({ onUploadComplete }) => {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    
    if (selectedFile) {
      // 엑셀 파일 확인
      if (!selectedFile.name.toLowerCase().match(/\.(xlsx|xls)$/)) {
        setError('엑셀 파일(.xlsx, .xls)만 업로드 가능합니다.');
        setFile(null);
        return;
      }
      
      setFile(selectedFile);
      setError(null);
      setUploadResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('업로드할 파일을 선택해주세요.');
      return;
    }

    setIsUploading(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/uploadTransactions', {
        method: 'POST',
        body: formData,
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || '파일 업로드 중 오류가 발생했습니다.');
      }
      
      setUploadResult(result);
      
      if (onUploadComplete) {
        onUploadComplete(result);
      }
      
      // 파일 선택 초기화
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setFile(null);
      
    } catch (err: any) {
      setError(err.message || '파일 업로드 중 오류가 발생했습니다.');
    } finally {
      setIsUploading(false);
    }
  };

  const resetUploader = () => {
    setFile(null);
    setError(null);
    setUploadResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={styles.uploader}>
      <div className={styles.header}>
        <h3>거래내역 업로드</h3>
      </div>
      
      <div className={styles.body}>
        <div className={styles.fileInput}>
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            disabled={isUploading}
            ref={fileInputRef}
            id="excel-file-input"
            className={styles.hiddenInput}
          />
          <label htmlFor="excel-file-input" className={styles.fileLabel}>
            {file ? file.name : '거래내역 엑셀 파일 선택'}
          </label>
          
          {file && (
            <span className={styles.fileName}>
              {file.name} ({(file.size / 1024).toFixed(2)} KB)
            </span>
          )}
        </div>
        
        <div className={styles.actions}>
          <button
            onClick={handleUpload}
            disabled={!file || isUploading}
            className={styles.uploadButton}
          >
            {isUploading ? '업로드 중...' : '업로드'}
          </button>
          
          {file && (
            <button onClick={resetUploader} className={styles.resetButton} disabled={isUploading}>
              취소
            </button>
          )}
        </div>
        
        {error && <div className={styles.error}>{error}</div>}
        
        {uploadResult && (
          <div className={styles.result}>
            <p className={styles.success}>업로드 완료!</p>
            <ul className={styles.stats}>
              <li>총 레코드: {uploadResult.totalRecords}개</li>
              <li>새로 추가된 거래: {uploadResult.newTransactions}개</li>
            </ul>
          </div>
        )}
      </div>
      
      <div className={styles.info}>
        <h4>엑셀 파일 형식 안내</h4>
        <p>다음 열을 포함한 엑셀 파일을 준비해주세요:</p>
        <ul>
          <li><strong>날짜</strong>: 거래 일자 (YYYY-MM-DD 또는 YYYY.MM.DD)</li>
          <li><strong>내용</strong>: 거래 내용 또는 메모</li>
          <li><strong>금액</strong>: 거래 금액</li>
          <li><strong>계좌</strong>: 계좌 정보 (선택사항)</li>
        </ul>
      </div>
    </div>
  );
};

export default FileUploader; 