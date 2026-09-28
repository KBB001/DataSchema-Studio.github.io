import { Schema } from '../types';
import { generateSql } from './sqlGenerator';

/**
 * Exports schema as a downloadable SQL file (.sql)
 */
export function exportSchemaAsSqlFile(schema: Schema): void {
  const sql = generateSql(schema, {
    dialect: schema.dialect,
    includeDropTable: false,
    includeForeignKeys: true,
    includeComments: true,
    includeIndexes: true,
  });

  const blob = new Blob([sql], { type: 'text/sql;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${schema.name.toLowerCase().replace(/\s+/g, '_')}_${schema.dialect.toLowerCase()}.sql`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Exports schema as a downloadable JSON file (.json)
 */
export function exportSchemaAsJsonFile(schema: Schema): void {
  const json = JSON.stringify(schema, null, 2);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${schema.name.toLowerCase().replace(/\s+/g, '_')}_schema.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Exports the visual canvas diagram as an SVG vector file
 */
export function exportDiagramAsSvg(schema: Schema, title: string = 'DataSchema Diagram'): void {
  const minX = Math.min(...schema.tables.map((t) => t.x), ...(schema.shapes || []).map((s) => s.x), 50);
  const minY = Math.min(...schema.tables.map((t) => t.y), ...(schema.shapes || []).map((s) => s.y), 50);
  const maxX = Math.max(
    ...schema.tables.map((t) => t.x + 300),
    ...(schema.shapes || []).map((s) => s.x + s.width),
    800
  );
  const maxY = Math.max(
    ...schema.tables.map((t) => t.y + 50 + t.columns.length * 30),
    ...(schema.shapes || []).map((s) => s.y + s.height),
    600
  );

  const width = Math.max(800, maxX - minX + 100);
  const height = Math.max(600, maxY - minY + 100);
  const offsetX = -minX + 50;
  const offsetY = -minY + 50;

  // Build SVG content
  let svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" style="background-color: #f8fafc; font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;">
  <defs>
    <filter id="shadow" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#000000" flood-opacity="0.08"/>
    </filter>
    <marker id="arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1 L 8 5 L 0 9 z" fill="#8b5cf6" />
    </marker>
  </defs>

  <!-- Title Header -->
  <text x="50" y="36" font-size="20" font-weight="bold" fill="#0f172a">${schema.name} — Архитектура БД (${schema.dialect})</text>
  <text x="50" y="54" font-size="12" fill="#64748b">Таблиц: ${schema.tables.length} • Связей: ${schema.relationships.length} • Экспортировано из DataSchema Studio</text>
`;

  // Draw Relationships (Curves)
  schema.relationships.forEach((rel) => {
    const srcTable = schema.tables.find((t) => t.id === rel.sourceTableId);
    const tgtTable = schema.tables.find((t) => t.id === rel.targetTableId);
    if (!srcTable || !tgtTable) return;

    const srcColIndex = srcTable.columns.findIndex((c) => c.id === rel.sourceColumnId);
    const tgtColIndex = tgtTable.columns.findIndex((c) => c.id === rel.targetColumnId);

    const srcX = srcTable.x + offsetX + (srcTable.x < tgtTable.x ? 280 : 0);
    const srcY = srcTable.y + offsetY + 40 + (srcColIndex >= 0 ? srcColIndex * 30 + 15 : 20);
    const tgtX = tgtTable.x + offsetX + (srcTable.x < tgtTable.x ? 0 : 280);
    const tgtY = tgtTable.y + offsetY + 40 + (tgtColIndex >= 0 ? tgtColIndex * 30 + 15 : 20);

    const dx = Math.abs(tgtX - srcX);
    const curvature = Math.max(dx * 0.5, 40);
    const c1X = srcTable.x < tgtTable.x ? srcX + curvature : srcX - curvature;
    const c2X = srcTable.x < tgtTable.x ? tgtX - curvature : tgtX + curvature;

    svgContent += `
  <path d="M ${srcX} ${srcY} C ${c1X} ${srcY}, ${c2X} ${tgtY}, ${tgtX} ${tgtY}" fill="none" stroke="${rel.color || '#8b5cf6'}" stroke-width="2" marker-end="url(#arrow)" />
  <rect x="${(srcX + tgtX) / 2 - 16}" y="${(srcY + tgtY) / 2 - 10}" width="32" height="20" rx="4" fill="#ffffff" stroke="#cbd5e1" stroke-width="1" />
  <text x="${(srcX + tgtX) / 2}" y="${(srcY + tgtY) / 2 + 4}" text-anchor="middle" font-size="10" font-family="monospace" font-weight="bold" fill="#6d28d9">${rel.type}</text>
`;
  });

  // Draw Shapes
  (schema.shapes || []).forEach((s) => {
    const x = s.x + offsetX;
    const y = s.y + offsetY;
    const w = s.width;
    const h = s.height;
    const fill = s.fillColor || '#ffffff';
    const stroke = s.strokeColor || '#334155';

    svgContent += `
  <g transform="translate(${x}, ${y})">
    <rect width="${w}" height="${h}" rx="${s.isRounded ? 8 : 0}" fill="${fill}" stroke="${stroke}" stroke-width="${s.strokeWidth || 1.5}" filter="url(#shadow)" />
    <text x="${w / 2}" y="${h / 2 + 4}" text-anchor="middle" font-size="${s.fontSize || 12}" fill="${s.textColor || '#0f172a'}" font-weight="500">${s.label || ''}</text>
  </g>
`;
  });

  // Draw Tables
  schema.tables.forEach((t) => {
    const x = t.x + offsetX;
    const y = t.y + offsetY;
    const w = 280;
    const h = 40 + t.columns.length * 30 + 10;
    const headerColor = t.strokeColor || t.color || '#3b82f6';

    svgContent += `
  <g transform="translate(${x}, ${y})" filter="url(#shadow)">
    <!-- Card Background -->
    <rect width="${w}" height="${h}" rx="8" fill="${t.fillColor || '#ffffff'}" stroke="#cbd5e1" stroke-width="1" />
    <!-- Header Bar -->
    <path d="M 0 8 Q 0 0 8 0 L ${w - 8} 0 Q ${w} 0 ${w} 8 L ${w} 38 L 0 38 Z" fill="#f8fafc" />
    <line x1="0" y1="0" x2="${w}" y2="0" stroke="${headerColor}" stroke-width="6" />
    <circle cx="16" cy="20" r="4" fill="${headerColor}" />
    <text x="28" y="24" font-size="13" font-weight="bold" fill="#0f172a">${t.name}</text>
    <text x="${w - 12}" y="24" text-anchor="end" font-size="10" fill="#94a3b8">(${t.columns.length})</text>
    <line x1="0" y1="38" x2="${w}" y2="38" stroke="#e2e8f0" stroke-width="1" />
`;

    t.columns.forEach((c, i) => {
      const colY = 40 + i * 30;
      const isPk = c.isPk;
      const isFk = c.isFk;

      svgContent += `
    <g transform="translate(0, ${colY})">
      <rect width="${w}" height="30" fill="${isPk ? '#fefce8' : 'transparent'}" />
      <text x="14" y="20" font-size="11" font-family="monospace" font-weight="${isPk ? 'bold' : 'normal'}" fill="${isPk ? '#b45309' : '#1e293b'}">${isPk ? '🔑 ' : isFk ? '🔗 ' : '• '}${c.name}</text>
      <rect x="${w - 75}" y="7" width="65" height="17" rx="3" fill="#f1f5f9" />
      <text x="${w - 42}" y="19" text-anchor="middle" font-size="9" font-family="monospace" fill="#64748b">${c.type}</text>
    </g>
`;
    });

    svgContent += `
  </g>
`;
  });

  svgContent += `</svg>`;

  const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${schema.name.toLowerCase().replace(/\s+/g, '_')}_diagram.svg`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Exports the visual canvas diagram as a high-res PNG image
 */
export function exportDiagramAsPng(schema: Schema): Promise<void> {
  return new Promise((resolve) => {
    // Generate SVG string first
    const minX = Math.min(...schema.tables.map((t) => t.x), ...(schema.shapes || []).map((s) => s.x), 50);
    const minY = Math.min(...schema.tables.map((t) => t.y), ...(schema.shapes || []).map((s) => s.y), 50);
    const maxX = Math.max(
      ...schema.tables.map((t) => t.x + 300),
      ...(schema.shapes || []).map((s) => s.x + s.width),
      800
    );
    const maxY = Math.max(
      ...schema.tables.map((t) => t.y + 50 + t.columns.length * 30),
      ...(schema.shapes || []).map((s) => s.y + s.height),
      600
    );

    const width = Math.max(800, maxX - minX + 100);
    const height = Math.max(600, maxY - minY + 100);
    const offsetX = -minX + 50;
    const offsetY = -minY + 50;

    let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" style="background-color: #f8fafc; font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;">
      <defs>
        <marker id="arrow2" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1 L 8 5 L 0 9 z" fill="#8b5cf6" />
        </marker>
      </defs>
      <rect width="${width}" height="${height}" fill="#f8fafc" />
      <text x="50" y="36" font-size="20" font-weight="bold" fill="#0f172a">${schema.name} — Архитектура БД (${schema.dialect})</text>
      <text x="50" y="54" font-size="12" fill="#64748b">Таблиц: ${schema.tables.length} • Связей: ${schema.relationships.length}</text>
    `;

    // Draw Relationships
    schema.relationships.forEach((rel) => {
      const srcTable = schema.tables.find((t) => t.id === rel.sourceTableId);
      const tgtTable = schema.tables.find((t) => t.id === rel.targetTableId);
      if (!srcTable || !tgtTable) return;

      const srcColIndex = srcTable.columns.findIndex((c) => c.id === rel.sourceColumnId);
      const tgtColIndex = tgtTable.columns.findIndex((c) => c.id === rel.targetColumnId);

      const srcX = srcTable.x + offsetX + (srcTable.x < tgtTable.x ? 280 : 0);
      const srcY = srcTable.y + offsetY + 40 + (srcColIndex >= 0 ? srcColIndex * 30 + 15 : 20);
      const tgtX = tgtTable.x + offsetX + (srcTable.x < tgtTable.x ? 0 : 280);
      const tgtY = tgtTable.y + offsetY + 40 + (tgtColIndex >= 0 ? tgtColIndex * 30 + 15 : 20);

      const dx = Math.abs(tgtX - srcX);
      const curvature = Math.max(dx * 0.5, 40);
      const c1X = srcTable.x < tgtTable.x ? srcX + curvature : srcX - curvature;
      const c2X = srcTable.x < tgtTable.x ? tgtX - curvature : tgtX + curvature;

      svgContent += `
        <path d="M ${srcX} ${srcY} C ${c1X} ${srcY}, ${c2X} ${tgtY}, ${tgtX} ${tgtY}" fill="none" stroke="${rel.color || '#8b5cf6'}" stroke-width="2" marker-end="url(#arrow2)" />
        <rect x="${(srcX + tgtX) / 2 - 16}" y="${(srcY + tgtY) / 2 - 10}" width="32" height="20" rx="4" fill="#ffffff" stroke="#cbd5e1" stroke-width="1" />
        <text x="${(srcX + tgtX) / 2}" y="${(srcY + tgtY) / 2 + 4}" text-anchor="middle" font-size="10" font-family="monospace" font-weight="bold" fill="#6d28d9">${rel.type}</text>
      `;
    });

    // Draw Shapes
    (schema.shapes || []).forEach((s) => {
      const x = s.x + offsetX;
      const y = s.y + offsetY;
      const w = s.width;
      const h = s.height;
      const fill = s.fillColor || '#ffffff';
      const stroke = s.strokeColor || '#334155';

      svgContent += `
        <g transform="translate(${x}, ${y})">
          <rect width="${w}" height="${h}" rx="${s.isRounded ? 8 : 0}" fill="${fill}" stroke="${stroke}" stroke-width="${s.strokeWidth || 1.5}" />
          <text x="${w / 2}" y="${h / 2 + 4}" text-anchor="middle" font-size="${s.fontSize || 12}" fill="${s.textColor || '#0f172a'}" font-weight="500">${s.label || ''}</text>
        </g>
      `;
    });

    // Draw Tables
    schema.tables.forEach((t) => {
      const x = t.x + offsetX;
      const y = t.y + offsetY;
      const w = 280;
      const h = 40 + t.columns.length * 30 + 10;
      const headerColor = t.strokeColor || t.color || '#3b82f6';

      svgContent += `
        <g transform="translate(${x}, ${y})">
          <rect width="${w}" height="${h}" rx="8" fill="${t.fillColor || '#ffffff'}" stroke="#cbd5e1" stroke-width="1" />
          <path d="M 0 8 Q 0 0 8 0 L ${w - 8} 0 Q ${w} 0 ${w} 8 L ${w} 38 L 0 38 Z" fill="#f8fafc" />
          <line x1="0" y1="0" x2="${w}" y2="0" stroke="${headerColor}" stroke-width="6" />
          <circle cx="16" cy="20" r="4" fill="${headerColor}" />
          <text x="28" y="24" font-size="13" font-weight="bold" fill="#0f172a">${t.name}</text>
          <text x="${w - 12}" y="24" text-anchor="end" font-size="10" fill="#94a3b8">(${t.columns.length})</text>
          <line x1="0" y1="38" x2="${w}" y2="38" stroke="#e2e8f0" stroke-width="1" />
      `;

      t.columns.forEach((c, i) => {
        const colY = 40 + i * 30;
        const isPk = c.isPk;
        const isFk = c.isFk;

        svgContent += `
          <g transform="translate(0, ${colY})">
            <rect width="${w}" height="30" fill="${isPk ? '#fefce8' : 'transparent'}" />
            <text x="14" y="20" font-size="11" font-family="monospace" font-weight="${isPk ? 'bold' : 'normal'}" fill="${isPk ? '#b45309' : '#1e293b'}">${isPk ? '🔑 ' : isFk ? '🔗 ' : '• '}${c.name}</text>
            <rect x="${w - 75}" y="7" width="65" height="17" rx="3" fill="#f1f5f9" />
            <text x="${w - 42}" y="19" text-anchor="middle" font-size="9" font-family="monospace" fill="#64748b">${c.type}</text>
          </g>
        `;
      });

      svgContent += `</g>`;
    });

    svgContent += `</svg>`;

    const img = new Image();
    const svgBlob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const DOMURL = window.URL || window.webkitURL || window;
    const url = DOMURL.createObjectURL(svgBlob);

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const scale = 2; // 2x Retina resolution
      canvas.width = width * scale;
      canvas.height = height * scale;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(scale, scale);
        ctx.drawImage(img, 0, 0);
        DOMURL.revokeObjectURL(url);

        canvas.toBlob((pngBlob) => {
          if (pngBlob) {
            const pngUrl = URL.createObjectURL(pngBlob);
            const a = document.createElement('a');
            a.href = pngUrl;
            a.download = `${schema.name.toLowerCase().replace(/\s+/g, '_')}_diagram.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(pngUrl);
          }
          resolve();
        });
      } else {
        resolve();
      }
    };
    img.src = url;
  });
}
