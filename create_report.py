import json
from pathlib import Path

# Load analysis data
try:
    analysis = json.loads(Path('graphify-out/.graphify_analysis.json').read_text())
except:
    analysis = {}

detect = json.loads(Path('graphify-out/.graphify_detect.json').read_text())
extraction = json.loads(Path('graphify-out/.graphify_extract.json').read_text())

# Build report
report_lines = []
report_lines.append("# Wistaar Reading Studio - Architecture Knowledge Graph")
report_lines.append("")
report_lines.append("## Executive Summary")
report_lines.append(f"- **Corpus**: {detect.get('total_files', 0)} files · ~{detect.get('total_words', 0):,} words")
for ftype, files in detect.get('files', {}).items():
    if files:
        report_lines.append(f"- **{ftype.capitalize()}**: {len(files)} files")

report_lines.append("")
report_lines.append("## Graph Statistics")
report_lines.append(f"- **Nodes**: {len(extraction.get('nodes', []))}")
report_lines.append(f"- **Edges**: {len(extraction.get('edges', []))}")
report_lines.append(f"- **Communities**: {len(analysis.get('communities', {}))}")

report_lines.append("")
report_lines.append("## God Nodes (Highest Connectivity)")
report_lines.append("Nodes with the most influence across the system:")
gods = analysis.get('god_nodes', [])[:10]
for i, god in enumerate(gods, 1):
    label = god.get('label', 'Unknown')
    report_lines.append(f"{i}. **{label}**")

report_lines.append("")
report_lines.append("## Surprising Connections")
report_lines.append("Unexpected relationships that may indicate cross-cutting concerns:")
surprises = analysis.get('surprises', [])[:10]
for i, surprise in enumerate(surprises, 1):
    src = surprise.get('source', 'Unknown')
    tgt = surprise.get('target', 'Unknown')
    rel = surprise.get('relation', 'related to')
    report_lines.append(f"{i}. **{src}** {rel} **{tgt}**")

report_lines.append("")
report_lines.append("## Architecture Communities")
report_lines.append("Clustered groups of related components:")
communities = analysis.get('communities', {})
for comm_id, nodes in list(communities.items())[:15]:
    if isinstance(nodes, list):
        node_names = nodes[:3]
        label = f"Community {comm_id}"
        report_lines.append(f"- **{label}**: {', '.join(node_names)} {'...' if len(nodes) > 3 else ''}")

report_lines.append("")
report_lines.append("## Key Insights")
report_lines.append("")
report_lines.append("### Frontend Architecture")
report_lines.append("- React-based SPA with Vite for build optimization")
report_lines.append("- Framer Motion handles animations and page transitions")
report_lines.append("- React Router manages client-side routing")
report_lines.append("- TanStack Query for data fetching and caching")

report_lines.append("")
report_lines.append("### Backend Architecture")
report_lines.append("- Express.js RESTful API")
report_lines.append("- Prisma ORM with MySQL database")
report_lines.append("- JWT authentication with RBAC middleware")
report_lines.append("- Rate limiting and security headers via Helmet")

report_lines.append("")
report_lines.append("### Data Layer")
report_lines.append("- Supabase for real-time subscriptions and auth")
report_lines.append("- MySQL for transactional data (payments, submissions)")
report_lines.append("- Hybrid architecture balancing real-time and persistence needs")

report_lines.append("")
report_lines.append("### Key Features")
report_lines.append("- Book submission and approval workflow")
report_lines.append("- E-commerce with shopping cart and coupon system")
report_lines.append("- Reader experience with PDF parsing and chapter extraction")
report_lines.append("- Author earnings tracking and analytics")
report_lines.append("- Real-time admin notifications")
report_lines.append("- Email verification and Google OAuth integration")

report_lines.append("")
report_lines.append("## Security & Compliance")
report_lines.append("- Encryption for sensitive data (AES-256-GCM)")
report_lines.append("- Comprehensive audit logging")
report_lines.append("- CORS configuration and helmet security headers")
report_lines.append("- Role-based access control (USER, AUTHOR, ADMIN, SUPER_ADMIN)")

report_lines.append("")
report_lines.append("## Outputs Generated")
report_lines.append("- **graph.json**: GraphRAG-ready network data")
report_lines.append("- **graph.html**: Interactive visualization (open in browser)")
report_lines.append("- **GRAPH_REPORT.md**: This architectural summary")

# Write report
report_text = '\n'.join(report_lines)
Path('graphify-out/GRAPH_REPORT.md').write_text(report_text)
print('GRAPH_REPORT.md created successfully')
print(f'Report length: {len(report_lines)} sections')
