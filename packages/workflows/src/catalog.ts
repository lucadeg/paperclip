import type { WorkflowDefinition } from './types.js';

export const STANDARD_WORKFLOWS: WorkflowDefinition[] = [
  {
    id: 'security-redteam-audit',
    name: 'Autonomous Security & Red-Team Audit',
    category: 'security',
    description: 'Runs automated endpoint reconnaissance, vulnerability assessment via HexStrike AI, SAST code review with Sentrux, and compiles an executive CVSS remediation report.',
    trigger: { type: 'manual' },
    requiredSkills: ['hexstrike-ai', 'sentrux-auditor'],
    steps: [
      {
        id: 'step-recon',
        name: 'Target Network & API Reconnaissance',
        assignedAgent: 'hexstrike-agent',
        toolRequired: 'hexstrike_recon_target',
        mcpServer: 'hexstrike-ai',
        inputs: { scan_type: 'deep' }
      },
      {
        id: 'step-vuln-scan',
        name: 'Vulnerability Probing (OWASP Top 10)',
        assignedAgent: 'hexstrike-agent',
        toolRequired: 'hexstrike_scan_vulnerabilities',
        mcpServer: 'hexstrike-ai',
        dependsOn: ['step-recon'],
        inputs: { categories: ['sqli', 'xss', 'csrf', 'idor'] }
      },
      {
        id: 'step-sast-audit',
        name: 'Static Source Code Security Audit',
        assignedAgent: 'sentrux-auditor',
        toolRequired: 'hexstrike_audit_source_code',
        mcpServer: 'hexstrike-ai',
        dependsOn: ['step-recon'],
        inputs: {}
      },
      {
        id: 'step-report',
        name: 'Executive Remediation & CVSS Report Generation',
        assignedAgent: 'hermes-orchestrator',
        toolRequired: 'hexstrike_generate_pentest_report',
        mcpServer: 'hexstrike-ai',
        dependsOn: ['step-vuln-scan', 'step-sast-audit'],
        inputs: {}
      }
    ]
  },
  {
    id: 'document-intelligence-archive',
    name: 'Document Intelligence, OCR & Memory Archiving',
    category: 'intelligence',
    description: 'Ingests documents into Paperless-ngx, performs OCR text extraction, generates clean markdown readability snapshots with KaraKeep, and persists long-term semantic knowledge into TencentDB Agent Memory.',
    trigger: { type: 'event', eventTopic: 'document.uploaded' },
    requiredSkills: ['paperless-ngx', 'karakeep', 'tencentdb-agent-memory'],
    steps: [
      {
        id: 'step-ocr',
        name: 'Paperless-ngx Document Ingestion & OCR',
        assignedAgent: 'paperless-worker',
        toolRequired: 'paperless_upload_document',
        mcpServer: 'paperless-ngx',
        inputs: {}
      },
      {
        id: 'step-archive-snapshot',
        name: 'Web & Document Clean Readability Snapshots',
        assignedAgent: 'karakeep-archiver',
        toolRequired: 'karakeep_save_bookmark',
        mcpServer: 'karakeep',
        dependsOn: ['step-ocr'],
        inputs: {}
      },
      {
        id: 'step-ltm-vectorize',
        name: 'Long-Term Memory Semantic Vectorization',
        assignedAgent: 'hermes-memory-manager',
        toolRequired: 'agent_memory_store',
        mcpServer: 'tencentdb-agent-memory',
        dependsOn: ['step-ocr'],
        inputs: { memory_type: 'semantic', importance: 5 }
      }
    ]
  },
  {
    id: 'geospatial-earth-monitoring',
    name: 'Geospatial Earth Observation & Spectral Monitoring',
    category: 'geospatial',
    description: 'Queries Copernicus Sentinel-2 STAC satellite imagery via GeoLibre, computes NDVI vegetation indices, and identifies environmental/crop changes.',
    trigger: { type: 'schedule', cronExpression: '0 0 * * 1' },
    requiredSkills: ['geolibre'],
    steps: [
      {
        id: 'step-stac-query',
        name: 'Query Sentinel-2 Satellite Scenes',
        assignedAgent: 'gis-analyst-agent',
        toolRequired: 'geolibre_query_stac_satellite',
        mcpServer: 'geolibre',
        inputs: { max_cloud_cover: 15 }
      },
      {
        id: 'step-ndvi-calc',
        name: 'Compute Multispectral NDVI & NDWI Indices',
        assignedAgent: 'gis-analyst-agent',
        toolRequired: 'geolibre_calculate_spectral_index',
        mcpServer: 'geolibre',
        dependsOn: ['step-stac-query'],
        inputs: { index_type: 'NDVI' }
      },
      {
        id: 'step-spatial-buffer',
        name: 'Generate Geographic Buffer & Change Detection Map',
        assignedAgent: 'gis-analyst-agent',
        toolRequired: 'geolibre_spatial_buffer_and_clip',
        mcpServer: 'geolibre',
        dependsOn: ['step-ndvi-calc'],
        inputs: { buffer_meters: 1000 }
      }
    ]
  },
  {
    id: 'secrets-vault-mesh-sync',
    name: 'Encrypted Secrets Management & Mesh File Sync',
    category: 'sync',
    description: 'Rotates API credentials securely in Vaultwarden, verifies zero-knowledge encryption, and triggers decentralized peer-to-peer workspace rescan via Syncthing.',
    trigger: { type: 'manual' },
    requiredSkills: ['vaultwarden', 'syncthing'],
    steps: [
      {
        id: 'step-gen-secret',
        name: 'Generate Secure Entropy Token',
        assignedAgent: 'security-worker',
        toolRequired: 'vaultwarden_generate_password',
        mcpServer: 'vaultwarden',
        inputs: { length: 32 }
      },
      {
        id: 'step-store-vault',
        name: 'Store Encrypted Secret in Vaultwarden',
        assignedAgent: 'security-worker',
        toolRequired: 'vaultwarden_save_secret',
        mcpServer: 'vaultwarden',
        dependsOn: ['step-gen-secret'],
        inputs: {}
      },
      {
        id: 'step-mesh-rescan',
        name: 'Trigger Syncthing P2P Decentralized Rescan',
        assignedAgent: 'devops-agent',
        toolRequired: 'syncthing_trigger_rescan',
        mcpServer: 'syncthing',
        dependsOn: ['step-store-vault'],
        inputs: { folder_id: 'hermes-workspace-sync' }
      }
    ]
  },
  {
    id: 'multi-agent-email-dispatch',
    name: 'Audited Multi-Agent Email Notification & Buzz Telemetry',
    category: 'devops',
    description: 'Dispatches signed, rate-limited email notifications via Gmail Master with audit logging, and streams execution metrics to Block Buzz.',
    trigger: { type: 'event', eventTopic: 'task.completed' },
    requiredSkills: ['gmail-master', 'buzz-monitor'],
    steps: [
      {
        id: 'step-send-email',
        name: 'Dispatch Audited Notification Email',
        assignedAgent: 'support-agent',
        toolRequired: 'gmail_master_send_email',
        mcpServer: 'gmail-master',
        inputs: {}
      },
      {
        id: 'step-buzz-telemetry',
        name: 'Record Execution Step in Block Buzz',
        assignedAgent: 'buzz-supervisor',
        toolRequired: 'buzz_record_telemetry',
        mcpServer: 'buzz',
        dependsOn: ['step-send-email'],
        inputs: { event_type: 'step_completed' }
      }
    ]
  }
];
