import React from 'react';
import UploadZoneBase from '../conciliacao/UploadZoneBase';

export default function OfxCartaoUploadZone({ onFile }) {
  return (
    <UploadZoneBase
      onFile={onFile}
      titulo="Arraste o arquivo OFX do cartão aqui"
      subtitulo="Apenas arquivos de extrato de cartão de crédito (máx. 5 MB)"
    />
  );
}
