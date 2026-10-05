import path from 'path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, type Plugin } from 'vite';
import { tanstackRouter } from '@tanstack/router-plugin/vite';

function mockApiPlugin(): Plugin {
  return {
    name: 'codex-mock-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith('/api')) {
          return next();
        }

        const url = new URL(req.url, 'http://localhost');
        const pathname = url.pathname;

        res.setHeader('Content-Type', 'application/json');

        if (req.method === 'OPTIONS') {
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', '*');
          res.statusCode = 204;
          res.end();
          return;
        }

        let body: any = {};
        if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
          try {
            const raw = await new Promise<string>((resolve) => {
              let data = '';
              req.on('data', (chunk) => {
                data += chunk;
              });
              req.on('end', () => resolve(data));
              req.on('error', () => resolve(''));
            });
            body = raw ? JSON.parse(raw) : {};
          } catch {
            body = {};
          }
        }

        // Public content (portfolio projects, blogs, reviews)
        if (pathname === '/api/public/content' || pathname === '/api/content') {
          res.end(
            JSON.stringify({
              ok: true,
              projects: [
                {
                  id: 1,
                  client: 'Apex Logistics',
                  title: 'Apex Logistics Fleet Platform',
                  site_name: 'Apex Logistics Suite',
                  image: '/work/apex-sales.jpg',
                  shortDescription: 'Enterprise logistics management portal with real-time fleet telematics.',
                  detailedDescription: 'Full-stack cloud portal powering over 450 fleet vehicles across North America with dispatch automation.',
                  category: 'Websites & Web Apps',
                  tag: 'Enterprise Web App',
                  tags: ['Enterprise', 'React', 'Telematics', 'Cloud'],
                  is_published: true,
                  published: true,
                  featured: true,
                  year: '2024',
                  lighthouse: {
                    performance: 99,
                    accessibility: 100,
                    bestPractices: 100,
                    seo: 100,
                  },
                },
                {
                  id: 2,
                  client: 'Vanguard Capital',
                  title: 'Vanguard Wealth Platform',
                  site_name: 'Vanguard Wealth Platform',
                  image: '/work/sovereign-capital.jpg',
                  shortDescription: 'High-net-worth wealth advisory portal with integrated CRM and portfolio reporting.',
                  detailedDescription: 'Institutional-grade wealth management platform with custom reporting engines and KYC workflows.',
                  category: 'CRMs & Calling Systems',
                  tag: 'Fintech & CRM',
                  tags: ['FinTech', 'CRM', 'Compliance', 'Security'],
                  is_published: true,
                  published: true,
                  featured: true,
                  year: '2024',
                  lighthouse: {
                    performance: 98,
                    accessibility: 100,
                    bestPractices: 96,
                    seo: 100,
                  },
                },
                {
                  id: 3,
                  client: 'Luminary Studio',
                  title: 'Luminary Brand Flagship',
                  site_name: 'Luminary Brand Flagship',
                  image: '/work/brand-identity.jpg',
                  shortDescription: 'Award-winning editorial e-commerce platform with sub-second page loads.',
                  detailedDescription: 'Bespoke digital flagship featuring 3D product previews and customized checkout pipelines.',
                  category: 'Graphic Design & Branding',
                  tag: 'Luxury Commerce',
                  tags: ['E-Commerce', 'Branding', 'Design System', 'WebGL'],
                  is_published: true,
                  published: true,
                  year: '2025',
                  lighthouse: {
                    performance: 100,
                    accessibility: 100,
                    bestPractices: 100,
                    seo: 100,
                  },
                },
                {
                  id: 4,
                  client: 'Nordic Goods',
                  title: 'Nordic Lifestyle Storefront',
                  site_name: 'Nordic Lifestyle Storefront',
                  image: '/work/nordic-goods.jpg',
                  shortDescription: 'Minimalist Scandinavian consumer retail platform with automated fulfillment.',
                  detailedDescription: 'Headless storefront optimized for international conversion and multi-currency checkouts.',
                  category: 'Websites & Web Apps',
                  tag: 'Global E-Commerce',
                  tags: ['Shopify Plus', 'Next.js', 'Conversion', 'Global'],
                  is_published: true,
                  published: true,
                  year: '2024',
                  lighthouse: {
                    performance: 99,
                    accessibility: 100,
                    bestPractices: 100,
                    seo: 98,
                  },
                },
                {
                  id: 5,
                  client: 'OmniCall Telephony',
                  title: 'OmniCall AI Sales Suite',
                  site_name: 'OmniCall AI Sales Suite',
                  image: '/work/omnicall-sales.jpg',
                  shortDescription: 'Automated outbound dialing and intelligent conversation analytics engine.',
                  detailedDescription: 'High-concurrency WebRTC softphone and voice intelligence system for 100+ SDRs.',
                  category: 'CRMs & Calling Systems',
                  tag: 'VoIP Telephony',
                  tags: ['VoIP', 'WebRTC', 'Telephony', 'AI Analytics'],
                  is_published: true,
                  published: true,
                  year: '2025',
                  lighthouse: {
                    performance: 97,
                    accessibility: 100,
                    bestPractices: 96,
                    seo: 100,
                  },
                },
                {
                  id: 6,
                  client: 'Aura Media',
                  title: 'Aura Growth Engine',
                  site_name: 'Aura Growth Engine',
                  image: '/work/aura-growth.jpg',
                  shortDescription: 'Performance marketing attribution engine driving 4.2x ROAS across paid channels.',
                  detailedDescription: 'Full-funnel media buying infrastructure with automated bid management and creative testing.',
                  category: 'Meta & Google Ads',
                  tag: 'Growth Marketing',
                  tags: ['Performance Ads', 'ROAS', 'Attribution', 'Creative Strategy'],
                  is_published: true,
                  published: true,
                  year: '2025',
                  lighthouse: {
                    performance: 99,
                    accessibility: 100,
                    bestPractices: 100,
                    seo: 100,
                  },
                },
              ],
              blogs: [
                {
                  id: 1,
                  title: 'Architecting Sub-50ms React Interfaces with Edge Computing',
                  slug: 'sub-50ms-react-interfaces',
                  excerpt: 'How we eliminate hydration delays, optimize SSR pipelines, and deliver near-instantaneous experiences for enterprise clients.',
                  category: 'Engineering',
                  created_at: '2025-01-15T10:00:00Z',
                  author: 'Codex Dynamics Engineering',
                  read_time: '5 min read',
                  status: 'published',
                },
                {
                  id: 2,
                  title: 'Building Bespoke High-Velocity CRMs: A Deep Dive',
                  slug: 'bespoke-high-velocity-crms',
                  excerpt: 'Why off-the-shelf software slows down revenue teams and how purpose-built workflows drive 3x pipeline throughput.',
                  category: 'Case Study',
                  created_at: '2025-02-01T10:00:00Z',
                  author: 'Codex Dynamics Strategy',
                  read_time: '8 min read',
                  status: 'published',
                },
                {
                  id: 3,
                  title: 'Design Systems That Scale Across Multi-Brand Portfolios',
                  slug: 'design-systems-that-scale',
                  excerpt: 'A blueprint for engineering resilient component architectures that empower design and speed up feature shipping.',
                  category: 'Design Systems',
                  created_at: '2025-02-18T10:00:00Z',
                  author: 'Design Systems Lead',
                  read_time: '6 min read',
                  status: 'published',
                },
              ],
              reviews: [
                {
                  id: 1,
                  author: 'Marcus Sterling',
                  company: 'Apex Logistics',
                  role: 'Chief Operating Officer',
                  content:
                    'Codex Dynamics transformed our operational infrastructure. The speed, attention to detail, and custom CRM they delivered gave us an unfair competitive edge.',
                  rating: 5,
                  is_published: true,
                },
                {
                  id: 2,
                  author: 'Elena Rostova',
                  company: 'Vanguard Capital',
                  role: 'Managing Director',
                  content:
                    'Flawless engineering execution and elevated design aesthetics. Our clients constantly compliment our new web portal and investor dashboards.',
                  rating: 5,
                  is_published: true,
                },
                {
                  id: 3,
                  author: 'Harrison Drake',
                  company: 'Nordic Goods',
                  role: 'Founder & CEO',
                  content:
                    'Conversion jumped 42% within three weeks of launch. The sub-second speed and silky smooth micro-interactions set a new standard in our industry.',
                  rating: 5,
                  is_published: true,
                },
              ],
            })
          );
          return;
        }

        // CRM Settings
        if (pathname === '/api/crm/settings' || pathname === '/api/admin/settings') {
          res.end(
            JSON.stringify({
              ok: true,
              settings: {
                platformName: 'Codex Dynamics',
                platformAbbreviation: 'CD',
                platformYear: '2025',
                platformPhone: '+1 (555) 123-4567',
                platformAddress: '100 Innovation Way, Suite 400, San Francisco, CA 94105',
                supportEmail: 'support@codexdynamics.com',
                heroHeader: 'High-Performance Web\n& Custom CRM Solutions.\nPowered by Engineering.',
                heroStatement:
                  'Custom web design, high-performance web applications, bespoke CRM software, and digital marketing engines.',
                baseCurrency: 'USD',
                registrationEnabled: true,
                twoFactorAuthEnabled: true,
                sessionTimeoutMinutes: 30,
                maxFailedLoginAttempts: 5,
                primaryColor: '#0071e3',
                secondaryColor: '#1E2026',
                accentColor: '#0071e3',
                buttonColor: '#0071e3',
                backgroundColor: '#0a0a0f',
                textColor: '#F9FAFB',
              },
            })
          );
          return;
        }

        // Staff / Admin Login
        if (pathname === '/api/admin/login') {
          let role = 'Super Admin';
          if (body.role) {
            const r = String(body.role).toLowerCase();
            if (r.includes('super')) role = 'Super Admin';
            else if (r.includes('office') || r.includes('manager')) role = 'Office Manager';
            else if (r.includes('team') || r.includes('leader')) role = 'Team Leader';
            else if (r.includes('agent')) role = 'Agent';
            else role = body.role;
          }

          const email = body.email || 'admin@codexdynamix.com';
          const name =
            role === 'Super Admin'
              ? 'Sarah Admin'
              : role === 'Office Manager'
              ? 'Olivia Manager'
              : role === 'Team Leader'
              ? 'Thomas Leader'
              : 'Alex Agent';
          const id =
            role === 'Super Admin'
              ? 'adm_sa'
              : role === 'Office Manager'
              ? 'adm_om'
              : role === 'Team Leader'
              ? 'adm_tl'
              : 'adm_ag';

          res.end(
            JSON.stringify({
              ok: true,
              authenticated: true,
              token: 'cdx_admin_token_demo',
              role,
              user: {
                id,
                name,
                email,
                role,
                office_id: 'of_london',
                office_name: 'London Operations',
                team_id: 'tm_alpha',
                team_name: 'Alpha Strategy',
                status: 'Active',
                capabilities: {
                  lead_upload: true,
                  create_agent: true,
                  registrations: true,
                  notifications: true,
                  security: true,
                },
              },
            })
          );
          return;
        }

        // Admin Current User
        if (pathname === '/api/admin/me') {
          res.end(
            JSON.stringify({
              ok: true,
              user: {
                id: 'adm_sa',
                name: 'Sarah Admin',
                email: 'admin@codexdynamix.com',
                role: 'Super Admin',
                office_id: 'of_london',
                office_name: 'London Operations',
                team_id: 'tm_alpha',
                team_name: 'Alpha Strategy',
                status: 'Active',
                capabilities: {
                  lead_upload: true,
                  create_agent: true,
                  registrations: true,
                  notifications: true,
                  security: true,
                },
              },
            })
          );
          return;
        }

        // Admin Offices
        if (pathname === '/api/admin/offices') {
          res.end(
            JSON.stringify({
              ok: true,
              offices: [
                {
                  id: 'of_london',
                  name: 'London Operations',
                  manager_id: 'adm_om',
                  manager_name: 'Olivia Manager',
                  manager_email: 'manager@codexdynamics.com',
                  team_count: 1,
                  agent_count: 2,
                  lead_count: 4,
                  created_at: '2024-01-01T00:00:00Z',
                },
                {
                  id: 'of_newyork',
                  name: 'New York Hub',
                  manager_id: null,
                  manager_name: 'Unassigned',
                  manager_email: '',
                  team_count: 1,
                  agent_count: 1,
                  lead_count: 2,
                  created_at: '2024-01-01T00:00:00Z',
                },
              ],
            })
          );
          return;
        }

        // Admin Teams
        if (pathname === '/api/admin/teams') {
          res.end(
            JSON.stringify({
              ok: true,
              teams: [
                {
                  id: 'tm_alpha',
                  name: 'Alpha Strategy',
                  office_id: 'of_london',
                  leader_id: 'adm_tl',
                  leader_name: 'Thomas Leader',
                  max_size: 10,
                  agent_count: 2,
                  lead_count: 4,
                  created_at: '2024-01-01T00:00:00Z',
                },
                {
                  id: 'tm_beta',
                  name: 'Beta Enterprise',
                  office_id: 'of_newyork',
                  leader_id: null,
                  leader_name: 'Unassigned',
                  max_size: 10,
                  agent_count: 1,
                  lead_count: 2,
                  created_at: '2024-01-01T00:00:00Z',
                },
              ],
            })
          );
          return;
        }

        // Admin Staff
        if (pathname === '/api/admin/staff') {
          res.end(
            JSON.stringify({
              ok: true,
              staff: [
                {
                  id: 'adm_sa',
                  name: 'Sarah Admin',
                  email: 'admin@codexdynamix.com',
                  role: 'Super Admin',
                  office_id: 'of_london',
                  office_name: 'London Operations',
                  team_id: 'tm_alpha',
                  team_name: 'Alpha Strategy',
                  status: 'Active',
                  capabilities: {
                    lead_upload: true,
                    create_agent: true,
                    registrations: true,
                    notifications: true,
                    security: true,
                  },
                  created_at: '2024-01-01T00:00:00Z',
                },
                {
                  id: 'adm_om',
                  name: 'Olivia Manager',
                  email: 'manager@codexdynamics.com',
                  role: 'Office Manager',
                  office_id: 'of_london',
                  office_name: 'London Operations',
                  team_id: null,
                  status: 'Active',
                  created_at: '2024-01-01T00:00:00Z',
                },
                {
                  id: 'adm_tl',
                  name: 'Thomas Leader',
                  email: 'leader@codexdynamics.com',
                  role: 'Team Leader',
                  office_id: 'of_london',
                  office_name: 'London Operations',
                  team_id: 'tm_alpha',
                  team_name: 'Alpha Strategy',
                  status: 'Active',
                  created_at: '2024-01-01T00:00:00Z',
                },
                {
                  id: 'adm_ag',
                  name: 'Alex Agent',
                  email: 'agent@codexdynamics.com',
                  role: 'Agent',
                  office_id: 'of_london',
                  office_name: 'London Operations',
                  team_id: 'tm_alpha',
                  team_name: 'Alpha Strategy',
                  status: 'Active',
                  created_at: '2024-01-01T00:00:00Z',
                },
              ],
            })
          );
          return;
        }

        // Admin Leads
        if (pathname === '/api/admin/leads') {
          res.end(
            JSON.stringify({
              ok: true,
              total: 3,
              leads: [
                {
                  id: 'ld_1001',
                  first_name: 'James',
                  last_name: 'Morrison',
                  name: 'James Morrison',
                  email: 'james.morrison@enterprise.co.uk',
                  phone: '+44 20 7946 0912',
                  country: 'United Kingdom',
                  country_code: 'GB',
                  stage: 'In Line',
                  status: 'In Line',
                  assigned_office_id: 'of_london',
                  assigned_team_id: 'tm_alpha',
                  assigned_agent_id: 'adm_ag',
                  assigned_agent_name: 'Alex Agent',
                  funnel: 'Web Development',
                  message: 'Requirements discovery for global corporate web platform.',
                  created_at: '2025-01-10T09:00:00Z',
                },
                {
                  id: 'ld_1002',
                  first_name: 'Sophia',
                  last_name: 'Chen',
                  name: 'Sophia Chen',
                  email: 'sophia@luminarybrands.com',
                  phone: '+1 415 555 2671',
                  country: 'United States',
                  country_code: 'US',
                  stage: 'Qualified',
                  status: 'Qualified',
                  assigned_office_id: 'of_london',
                  assigned_team_id: 'tm_alpha',
                  assigned_agent_id: 'adm_ag',
                  assigned_agent_name: 'Alex Agent',
                  funnel: 'CRMs & Calling Systems',
                  message: 'Custom softphone and sales routing system for 25 agents.',
                  created_at: '2025-01-14T11:30:00Z',
                },
                {
                  id: 'ld_1003',
                  first_name: 'Henrik',
                  last_name: 'Lindqvist',
                  name: 'Henrik Lindqvist',
                  email: 'henrik@nordicgoods.se',
                  phone: '+46 8 123 4567',
                  country: 'Sweden',
                  country_code: 'SE',
                  stage: 'Deposit',
                  status: 'Deposit',
                  assigned_office_id: 'of_london',
                  assigned_team_id: 'tm_alpha',
                  assigned_agent_id: 'adm_ag',
                  assigned_agent_name: 'Alex Agent',
                  funnel: 'Websites & Web Apps',
                  message: 'International multi-currency headless e-commerce store.',
                  created_at: '2025-01-20T14:15:00Z',
                },
              ],
            })
          );
          return;
        }

        // Admin Notifications
        if (pathname.startsWith('/api/admin/notifications')) {
          res.end(
            JSON.stringify({
              ok: true,
              notifications: [],
              unreadCount: 0,
              log: [],
              total: 0,
            })
          );
          return;
        }

        // Admin Logout
        if (pathname === '/api/admin/logout') {
          res.end(JSON.stringify({ ok: true }));
          return;
        }

        // Portal Login
        if (pathname === '/api/portal/login') {
          res.end(
            JSON.stringify({
              ok: true,
              authenticated: true,
              token: 'cdx_portal_token_demo',
              client: {
                id: 'demo_client_1',
                name: 'Marcus Sterling',
                company: 'Apex Logistics',
                email: 'marcus@apexlogistics.com',
                phone: '+1 (555) 987-6543',
                status: 'Active',
                portalEnabled: true,
                tier: 'Enterprise',
              },
            })
          );
          return;
        }

        // Portal Data
        if (pathname === '/api/portal/data') {
          const clientId = url.searchParams.get('client_id') || 'demo_client_1';
          res.end(
            JSON.stringify({
              ok: true,
              client: {
                id: clientId,
                name: 'Marcus Sterling',
                company: 'Apex Logistics',
                email: 'marcus@apexlogistics.com',
                phone: '+1 (555) 987-6543',
                address: '742 Evergreen Terrace',
                country: 'United States',
                countryCode: 'US',
                status: 'Active',
                portalEnabled: true,
                tier: 'Enterprise',
                lastLoginAt: new Date().toISOString(),
                createdAt: new Date().toISOString(),
              },
              websites: [
                {
                  id: 'web_1',
                  clientId: clientId,
                  name: 'Apex Logistics Web Fleet',
                  domain: 'apexlogistics.com',
                  websiteUrl: 'https://apexlogistics.com',
                  backOfficeUrl: 'https://apexlogistics.com/admin',
                  status: 'Active',
                  connectionStatus: 'Connected',
                  connectorId: 'conn_apex_1',
                  connectorSecret: 'sec_apex_1',
                  accessEnabled: true,
                  techStack: ['React', 'TypeScript', 'Node.js'],
                  hostingPlan: 'Enterprise Dedicated',
                  sslStatus: 'Valid',
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                },
              ],
              projects: [
                {
                  id: 'proj_1',
                  clientId: clientId,
                  name: 'Fleet Automation Phase 2',
                  status: 'In Progress',
                  progress: 68,
                  category: 'Websites & Web Apps',
                  startDate: '2025-01-10',
                  targetDate: '2025-04-15',
                  description: 'Automated dispatching routing algorithm and client self-service tracking widget.',
                  budget: '$45,000',
                  spent: '$30,600',
                },
              ],
              invoices: [
                {
                  id: 'inv_101',
                  clientId: clientId,
                  invoiceNumber: 'INV-2025-001',
                  amount: 15000,
                  currency: 'USD',
                  status: 'Paid',
                  issueDate: '2025-01-15',
                  dueDate: '2025-02-15',
                  paidAt: '2025-01-20',
                  items: [
                    { description: 'Sprint 1 - Core Fleet Telematics Architecture', amount: 15000 },
                  ],
                },
                {
                  id: 'inv_102',
                  clientId: clientId,
                  invoiceNumber: 'INV-2025-002',
                  amount: 15000,
                  currency: 'USD',
                  status: 'Paid',
                  issueDate: '2025-02-15',
                  dueDate: '2025-03-15',
                  paidAt: '2025-02-18',
                  items: [
                    { description: 'Sprint 2 - Live Telemetry & Real-Time Sync', amount: 15000 },
                  ],
                },
              ],
              payments: [],
              tickets: [],
            })
          );
          return;
        }

        // Specific admin lists
        if (pathname === '/api/admin/users') {
          res.end(JSON.stringify({ ok: true, users: [] }));
          return;
        }

        if (pathname === '/api/admin/hostinger/mailboxes') {
          res.end(JSON.stringify({ ok: true, mailboxes: [] }));
          return;
        }

        if (pathname.startsWith('/api/admin/messages')) {
          res.end(JSON.stringify({ ok: true, messages: [] }));
          return;
        }

        if (pathname.startsWith('/api/crm/theme') || pathname.startsWith('/api/admin/theme')) {
          res.end(JSON.stringify({ ok: true }));
          return;
        }

        // Generic success for leads, subscribers, logout, crm actions, etc.
        res.end(
          JSON.stringify({
            ok: true,
            success: true,
            message: 'Success',
            data: [],
          })
        );
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [
      tanstackRouter({ target: 'react', autoCodeSplitting: true }),
      react(),
      tailwindcss(),
      mockApiPlugin(),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
      dedupe: ['react', 'react-dom'],
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      allowedHosts: true as const,
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    preview: {
      port: 3000,
      host: '0.0.0.0',
      allowedHosts: true as const,
    },
  };
});
