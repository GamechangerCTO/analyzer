export const FIXTURES = {
  users: {
    admin: {
      id: 'admin-uuid-1234',
      email: 'admin@test.com',
      role: 'admin',
      is_approved: true,
      company_id: 'comp-uuid-1',
      full_name: 'Test Admin',
    },
    manager: {
      id: 'mgr-uuid-1234',
      email: 'manager@test.com',
      role: 'manager',
      is_approved: true,
      company_id: 'comp-uuid-1',
      full_name: 'Test Manager',
    },
    agent: {
      id: 'agent-uuid-1234',
      email: 'agent@test.com',
      role: 'agent',
      is_approved: true,
      company_id: 'comp-uuid-1',
      full_name: 'Test Agent',
    },
    unapproved: {
      id: 'pending-uuid-1234',
      email: 'pending@test.com',
      role: 'agent',
      is_approved: false,
      company_id: 'comp-uuid-1',
      full_name: 'Pending Agent',
    },
    superAdmin: {
      id: 'super-uuid-1234',
      email: 'ido.segev23@gmail.com',
      role: 'admin',
      is_approved: true,
      company_id: 'comp-uuid-1',
      full_name: 'Super Admin',
    },
  },

  companies: {
    standard: {
      id: 'comp-uuid-1',
      name: 'Test Corp',
      is_poc: false,
      industry: 'technology',
    },
    poc: {
      id: 'comp-uuid-2',
      name: 'POC Corp',
      is_poc: true,
      industry: 'sales',
    },
  },

  partnerKeys: {
    valid: {
      key_id: 'pk-uuid-1',
      partner_name: 'Test Partner',
      environment: 'sandbox',
      company_id: 'comp-uuid-1',
      is_valid: true,
      permissions: { all: true },
    },
    restricted: {
      key_id: 'pk-uuid-2',
      partner_name: 'Restricted Partner',
      environment: 'production',
      company_id: 'comp-uuid-1',
      is_valid: true,
      permissions: { 'calls.analyze': true, 'companies.read': false },
    },
    noCompany: {
      key_id: 'pk-uuid-3',
      partner_name: 'Global Partner',
      environment: 'sandbox',
      company_id: null,
      is_valid: true,
      permissions: { 'companies.read': true },
    },
  },

  sessions: {
    valid: {
      user: {
        id: 'agent-uuid-1234',
        email: 'agent@test.com',
        user_metadata: { full_name: 'Test Agent' },
      },
    },
  },

  approvalRequests: {
    pending: {
      id: 'req-uuid-1',
      email: 'newagent@test.com',
      full_name: 'New Agent',
      company_id: 'comp-uuid-1',
      requested_by: 'mgr-uuid-1234',
      status: 'pending',
    },
  },
}
