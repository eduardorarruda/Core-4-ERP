import React from 'react';
import UploadZoneBase from './UploadZoneBase';

export default function OfxUploadZone({ onFile }) {
  return (
    <UploadZoneBase
      onFile={onFile}
      titulo="Arraste o arquivo .OFX aqui"
      subtitulo="ou clique para selecionar (máx. 5 MB)"
    />
  );
}
