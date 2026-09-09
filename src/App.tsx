import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';
import './App.css';
import { supabase } from './lib/supabase';

type LeadStatus =
  | 'New'
  | 'Contacted'
  | 'Qualified'
  | 'Proposal Sent'
  | 'Negotiation'
  | 'Won'
  | 'Lost';

type ActivityType = 'Note' | 'Call' | 'Follow-up';

type Lead = {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  source: string;
  assignedUser: string;
  notes: string;
  status: LeadStatus;
  value: number;
  createdAt: string;
};

type Activity = {
  id: number;
  leadId: string;
  type: ActivityType;
  title: string;
  description: string;
  dueDate: string;
  assignedUser: string;
  completed: boolean;
  createdAt: string;
};

type AuditLog = {
  id: number;
  action: string;
  entity: string;
  details: string;
  user: string;
  timestamp: string;
};

const stages: LeadStatus[] = [
  'New',
  'Contacted',
  'Qualified',
  'Proposal Sent',
  'Negotiation',
  'Won',
  'Lost',
];

const activityTypes: ActivityType[] = ['Note', 'Call', 'Follow-up'];

const initialActivities: Activity[] = [];

const initialAuditLogs: AuditLog[] = [];

function loadStored<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key);

    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    console.warn(`Unable to load ${key} from localStorage.`);
  }

  return fallback;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-IN').format(value);
}

function formatCurrency(value: number) {
  return `₹${formatNumber(value)}`;
}

function getStatusClass(status: LeadStatus) {
  return status.toLowerCase().replace(/\s+/g, '-');
}

function App() {
  const [activePage, setActivePage] = useState('Dashboard');

  const [leads, setLeads] = useState<Lead[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(true);

  const [activities, setActivities] = useState<Activity[]>(() =>
    loadStored('crm_activities', initialActivities)
  );

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() =>
    loadStored('crm_audit_logs', initialAuditLogs)
  );

  const [globalSearch, setGlobalSearch] = useState('');

  const currentUser = 'Shaik Zafferuddin';

  /*
   * Load leads from Supabase
   */
  useEffect(() => {
    const loadLeads = async () => {
      setLeadsLoading(true);

      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to load leads:', error);
        setLeadsLoading(false);
        return;
      }

      const mappedLeads: Lead[] = (data ?? []).map((lead) => ({
        id: lead.id,
        name: lead.lead_name,
        company: lead.company_name,
        email: lead.email ?? '',
        phone: lead.phone ?? '',
        source: lead.lead_source,
        assignedUser: lead.assigned_user_id ?? '',
        notes: lead.notes ?? '',
        status: lead.status as LeadStatus,
        value: Number(lead.pipeline_value ?? 0),
        createdAt: lead.created_at,
      }));

      setLeads(mappedLeads);
      setLeadsLoading(false);
    };

    loadLeads();
  }, []);

  useEffect(() => {
    localStorage.setItem('crm_activities', JSON.stringify(activities));
  }, [activities]);

  useEffect(() => {
    localStorage.setItem('crm_audit_logs', JSON.stringify(auditLogs));
  }, [auditLogs]);

  const addAuditLog = (action: string, entity: string, details: string) => {
    const newLog: AuditLog = {
      id: Date.now(),
      action,
      entity,
      details,
      user: currentUser,
      timestamp: new Date().toLocaleString('en-IN'),
    };

    setAuditLogs((previous) => [newLog, ...previous]);
  };

  /*
   * ADD LEAD
   */
  const addLead = async (leadData: Omit<Lead, 'id' | 'createdAt'>) => {
    const { data, error } = await supabase
      .from('leads')
      .insert({
        lead_name: leadData.name,
        company_name: leadData.company,
        email: leadData.email,
        phone: leadData.phone,
        lead_source: leadData.source,
        notes: leadData.notes,
        status: leadData.status,
        pipeline_value: leadData.value,
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create lead:', error);
      alert(`Failed to create lead: ${error.message}`);
      return;
    }

    const newLead: Lead = {
      id: data.id,
      name: data.lead_name,
      company: data.company_name,
      email: data.email ?? '',
      phone: data.phone ?? '',
      source: data.lead_source,
      assignedUser: data.assigned_user_id ?? '',
      notes: data.notes ?? '',
      status: data.status as LeadStatus,
      value: Number(data.pipeline_value ?? 0),
      createdAt: data.created_at,
    };

    setLeads((previous) => [newLead, ...previous]);

    addAuditLog('Created', 'Lead', `${newLead.name} created`);
  };

  /*
   * UPDATE LEAD
   */
  const updateLead = async (updatedLead: Lead) => {
    const { data, error } = await supabase
      .from('leads')
      .update({
        lead_name: updatedLead.name,
        company_name: updatedLead.company,
        email: updatedLead.email,
        phone: updatedLead.phone,
        lead_source: updatedLead.source,
        notes: updatedLead.notes,
        status: updatedLead.status,
        pipeline_value: updatedLead.value,
        updated_at: new Date().toISOString(),
      })
      .eq('id', updatedLead.id)
      .select();

    if (error) {
      console.error('Failed to update lead:', error);
      alert(`Failed to update lead: ${error.message}`);
      return;
    }

    if (!data || data.length === 0) {
      alert('Lead was not updated. No matching lead was returned.');
      return;
    }

    const lead = data[0];

    const mappedLead: Lead = {
      id: lead.id,
      name: lead.lead_name,
      company: lead.company_name,
      email: lead.email ?? '',
      phone: lead.phone ?? '',
      source: lead.lead_source,
      assignedUser: lead.assigned_user_id ?? '',
      notes: lead.notes ?? '',
      status: lead.status as LeadStatus,
      value: Number(lead.pipeline_value ?? 0),
      createdAt: lead.created_at,
    };

    setLeads((previous) =>
      previous.map((item) => (item.id === mappedLead.id ? mappedLead : item))
    );

    addAuditLog('Updated', 'Lead', `${mappedLead.name} updated`);

    alert('Lead updated successfully.');
  };

  /*
   * DELETE LEAD
   */
  const deleteLead = async (id: string) => {
    const lead = leads.find((item) => item.id === id);

    if (!lead) {
      return;
    }

    const confirmed = window.confirm(`Delete ${lead.name}?`);

    if (!confirmed) {
      return;
    }

    const { error } = await supabase.from('leads').delete().eq('id', id);

    if (error) {
      console.error('Failed to delete lead:', error);
      alert(`Failed to delete lead: ${error.message}`);
      return;
    }

    setLeads((previous) => previous.filter((item) => item.id !== id));

    setActivities((previous) =>
      previous.filter((activity) => activity.leadId !== id)
    );

    addAuditLog('Deleted', 'Lead', `${lead.name} deleted`);
  };

  /*
   * MOVE LEAD / PIPELINE
   */
  const moveLead = async (leadId: string, newStatus: LeadStatus) => {
    const lead = leads.find((item) => item.id === leadId);

    if (!lead || lead.status === newStatus) {
      return;
    }

    const previousStatus = lead.status;

    const { error } = await supabase
      .from('leads')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', leadId);

    if (error) {
      console.error('Failed to move lead:', error);
      alert(`Failed to move lead: ${error.message}`);
      return;
    }

    setLeads((previous) =>
      previous.map((item) =>
        item.id === leadId ? { ...item, status: newStatus } : item
      )
    );

    await supabase.from('stage_history').insert({
      lead_id: leadId,
      from_stage: previousStatus,
      to_stage: newStatus,
    });

    addAuditLog(
      'Stage Changed',
      'Lead',
      `${lead.name} moved ${previousStatus} → ${newStatus}`
    );
  };

  /*
   * ACTIVITIES
   */
  const addActivity = (activityData: Omit<Activity, 'id' | 'createdAt'>) => {
    const newActivity: Activity = {
      ...activityData,
      id: Date.now(),
      createdAt: new Date().toISOString().slice(0, 10),
    };

    setActivities((previous) => [newActivity, ...previous]);

    const lead = leads.find((item) => item.id === activityData.leadId);

    addAuditLog(
      'Created',
      'Activity',
      `${activityData.title} created for ${lead?.name || 'lead'}`
    );
  };

  const updateActivity = (updatedActivity: Activity) => {
    setActivities((previous) =>
      previous.map((activity) =>
        activity.id === updatedActivity.id ? updatedActivity : activity
      )
    );

    addAuditLog('Updated', 'Activity', `${updatedActivity.title} updated`);
  };

  const deleteActivity = (id: number) => {
    const activity = activities.find((item) => item.id === id);

    setActivities((previous) => previous.filter((item) => item.id !== id));

    if (activity) {
      addAuditLog('Deleted', 'Activity', `${activity.title} deleted`);
    }
  };

  const toggleActivity = (id: number) => {
    setActivities((previous) =>
      previous.map((activity) =>
        activity.id === id
          ? {
              ...activity,
              completed: !activity.completed,
            }
          : activity
      )
    );
  };

  /*
   * DASHBOARD CALCULATIONS
   */
  const totalLeads = leads.length;

  const qualifiedLeads = leads.filter(
    (lead) =>
      lead.status === 'Qualified' ||
      lead.status === 'Proposal Sent' ||
      lead.status === 'Negotiation'
  ).length;

  const wonDeals = leads.filter((lead) => lead.status === 'Won').length;

  const lostDeals = leads.filter((lead) => lead.status === 'Lost').length;

  const pipelineValue = leads
    .filter((lead) => lead.status !== 'Won' && lead.status !== 'Lost')
    .reduce((sum, lead) => sum + lead.value, 0);

  const revenue = leads
    .filter((lead) => lead.status === 'Won')
    .reduce((sum, lead) => sum + lead.value, 0);

  const conversionRate =
    totalLeads > 0 ? Math.round((wonDeals / totalLeads) * 100) : 0;

  /*
   * GLOBAL SEARCH
   */
  const filteredGlobalLeads = useMemo(() => {
    const query = globalSearch.toLowerCase().trim();

    if (!query) {
      return leads;
    }

    return leads.filter(
      (lead) =>
        lead.name.toLowerCase().includes(query) ||
        lead.company.toLowerCase().includes(query) ||
        lead.email.toLowerCase().includes(query) ||
        lead.phone.toLowerCase().includes(query)
    );
  }, [leads, globalSearch]);

  return (
    <div className="app-shell">
      <Sidebar activePage={activePage} onNavigate={setActivePage} />

      <div className="main-area">
        <header className="topbar">
          <div className="mobile-brand">
            <CRMLogo />
            <span>CRM</span>
          </div>

          <div className="topbar-search">
            <span>⌕</span>

            <input
              value={globalSearch}
              onChange={(event) => setGlobalSearch(event.target.value)}
              placeholder="Search leads, companies..."
            />
          </div>

          <div className="topbar-user">
            <div className="notification">♢</div>

            <div className="user-avatar">SZ</div>

            <div className="user-info">
              <strong>{currentUser}</strong>
              <span>Admin</span>
            </div>
          </div>
        </header>

        <main className="content">
          {leadsLoading && (
            <div className="loading-state">Loading CRM data...</div>
          )}

          {!leadsLoading && activePage === 'Dashboard' && (
            <DashboardPage
              leads={leads}
              activities={activities}
              totalLeads={totalLeads}
              qualifiedLeads={qualifiedLeads}
              wonDeals={wonDeals}
              lostDeals={lostDeals}
              pipelineValue={pipelineValue}
              revenue={revenue}
              conversionRate={conversionRate}
              onNavigate={setActivePage}
            />
          )}

          {!leadsLoading && activePage === 'Leads' && (
            <LeadsPage
              leads={filteredGlobalLeads}
              onAdd={addLead}
              onUpdate={updateLead}
              onDelete={deleteLead}
            />
          )}

          {!leadsLoading && activePage === 'Pipeline' && (
            <PipelinePage leads={leads} onMoveLead={moveLead} />
          )}

          {!leadsLoading && activePage === 'Activities' && (
            <ActivitiesPage
              leads={leads}
              activities={activities}
              onAdd={addActivity}
              onUpdate={updateActivity}
              onDelete={deleteActivity}
              onToggle={toggleActivity}
            />
          )}

          {!leadsLoading && activePage === 'Reports' && (
            <ReportsPage leads={leads} />
          )}

          {!leadsLoading && activePage === 'AI Insights' && (
            <AIPage leads={leads} activities={activities} />
          )}

          {!leadsLoading && activePage === 'Audit Logs' && (
            <AuditLogsPage logs={auditLogs} />
          )}
        </main>
      </div>
    </div>
  );
}
function CRMLogo() {
  return (
    <svg
      className="crm-logo"
      width="42"
      height="42"
      viewBox="0 0 48 48"
      style={{
        width: '42px',
        height: '42px',
        minWidth: '42px',
        minHeight: '42px',
        maxWidth: '42px',
        maxHeight: '42px',
        flexShrink: 0,
        display: 'block',
      }}
      xmlns="http://www.w3.org/2000/svg"
      aria-label="CRM logo"
    >
      <rect width="48" height="48" rx="11" fill="#ffffff" />

      <rect
        x="9"
        y="28"
        width="7"
        height="11"
        rx="2"
        fill="#42A5F5"
      />

      <rect
        x="20"
        y="22"
        width="7"
        height="17"
        rx="2"
        fill="#2196F3"
      />

      <rect
        x="31"
        y="15"
        width="7"
        height="24"
        rx="2"
        fill="#1565E8"
      />

      <path
        d="M9 27 C16 25, 21 21, 27 17 C30 15, 33 12, 38 9"
        fill="none"
        stroke="#18B981"
        strokeWidth="4"
        strokeLinecap="round"
      />

      <path
        d="M33 9 L39 8 L38 14"
        fill="none"
        stroke="#18B981"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function Sidebar({
  activePage,
  onNavigate,
}: {
  activePage: string;
  onNavigate: (page: string) => void;
}) {
  const menuItems = [
    { name: 'Dashboard', icon: '▦' },
    { name: 'Leads', icon: '♙' },
    { name: 'Pipeline', icon: '▤' },
    { name: 'Activities', icon: '✓' },
    { name: 'Reports', icon: '▥' },
    { name: 'AI Insights', icon: '✦' },
    { name: 'Audit Logs', icon: '◷' },
  ];

  return (
    <aside className="sidebar">
      <button
        type="button"
        onClick={() => onNavigate('Dashboard')}
        style={{
          width: '100%',
          height: '90px',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          padding: '18px 20px',
          margin: 0,
          backgroundColor: '#0b1728',
          background: '#0b1728',
          border: 'none',
          borderBottom: '1px solid #24344d',
          borderRadius: 0,
          color: '#ffffff',
          textAlign: 'left',
          cursor: 'pointer',
          boxSizing: 'border-box',
          appearance: 'none',
          WebkitAppearance: 'none',
        }}
      >
        <CRMLogo />

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '3px',
          }}
        >
          <strong
            style={{
              fontSize: '18px',
              lineHeight: '1.2',
              color: '#ffffff',
            }}
          >
            CRM
          </strong>

          <span
            style={{
              fontSize: '11px',
              lineHeight: '1.2',
              color: '#9aa9bf',
            }}
          >
            Sales Platform
          </span>
        </div>
      </button>

      <nav className="sidebar-nav">
        <div className="nav-label">MAIN MENU</div>

        {menuItems.map((item) => (
          <button
            key={item.name}
            className={`nav-item ${
              activePage === item.name ? 'active' : ''
            }`}
            onClick={() => onNavigate(item.name)}
          >
            <span className="nav-icon">{item.icon}</span>

            <span>{item.name}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-footer-card">
          <span className="online-dot" />

          <div>
            <strong>System Online</strong>
            <span>All services operational</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-header">
      <div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>

      {action}
    </div>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  icon,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon?: string;
}) {
  return (
    <div className="stat-card">
      <div className="stat-card-top">
        <span>{title}</span>

        {icon && <div className="stat-icon">{icon}</div>}
      </div>

      <strong>{value}</strong>

      <small>{subtitle}</small>
    </div>
  );
}

function DashboardPage({
  leads,
  activities,
  totalLeads,
  qualifiedLeads,
  wonDeals,
  lostDeals,
  pipelineValue,
  revenue,
  conversionRate,
  onNavigate,
}: {
  leads: Lead[];
  activities: Activity[];
  totalLeads: number;
  qualifiedLeads: number;
  wonDeals: number;
  lostDeals: number;
  pipelineValue: number;
  revenue: number;
  conversionRate: number;
  onNavigate: (page: string) => void;
}) {
  const recentLeads = leads.slice(0, 5);

  const pendingActivities = activities.filter(
    (activity) => !activity.completed
  );

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Overview of your sales activity and pipeline."
        action={
          <button
            className="primary-button"
            onClick={() => onNavigate('Leads')}
          >
            + Add Lead
          </button>
        }
      />

      <div className="stats-grid">
        <StatCard
          title="Total Leads"
          value={totalLeads}
          subtitle="All leads"
          icon="♙"
        />

        <StatCard
          title="Qualified Leads"
          value={qualifiedLeads}
          subtitle="Ready for sales"
          icon="✓"
        />

        <StatCard
          title="Won Deals"
          value={wonDeals}
          subtitle={formatCurrency(revenue)}
          icon="↗"
        />

        <StatCard
          title="Lost Deals"
          value={lostDeals}
          subtitle="Closed lost"
          icon="×"
        />

        <StatCard
          title="Pipeline Value"
          value={formatCurrency(pipelineValue)}
          subtitle="Open opportunities"
          icon="◈"
        />

        <StatCard
          title="Conversion Rate"
          value={`${conversionRate}%`}
          subtitle="Won / total leads"
          icon="%"
        />
      </div>

      <div className="dashboard-grid">
        <section className="card">
          <div className="card-header">
            <div>
              <h2>Recent Leads</h2>
              <p>Your latest sales opportunities</p>
            </div>

            <button className="text-button" onClick={() => onNavigate('Leads')}>
              View All →
            </button>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Lead</th>
                  <th>Company</th>
                  <th>Source</th>
                  <th>Status</th>
                  <th>Value</th>
                </tr>
              </thead>

              <tbody>
                {recentLeads.map((lead) => (
                  <tr key={lead.id}>
                    <td>
                      <div className="lead-cell">
                        <div className="small-avatar">
                          {lead.name
                            .split(' ')
                            .map((item) => item[0])
                            .join('')
                            .slice(0, 2)}
                        </div>

                        <div>
                          <strong>{lead.name}</strong>
                          <span>{lead.email}</span>
                        </div>
                      </div>
                    </td>

                    <td>{lead.company}</td>

                    <td>{lead.source}</td>

                    <td>
                      <StatusBadge status={lead.status} />
                    </td>

                    <td>{formatCurrency(lead.value)}</td>
                  </tr>
                ))}

                {recentLeads.length === 0 && (
                  <tr>
                    <td colSpan={5} className="empty-table">
                      No leads available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card">
          <div className="card-header">
            <div>
              <h2>Upcoming Activities</h2>
              <p>Tasks requiring attention</p>
            </div>

            <button
              className="text-button"
              onClick={() => onNavigate('Activities')}
            >
              View All →
            </button>
          </div>

          <div className="activity-preview">
            {pendingActivities.length === 0 ? (
              <div className="empty-state">No pending activities.</div>
            ) : (
              pendingActivities.slice(0, 5).map((activity) => {
                const lead = leads.find((item) => item.id === activity.leadId);

                return (
                  <div className="activity-preview-item" key={activity.id}>
                    <div
                      className={`activity-type-icon ${activity.type.toLowerCase()}`}
                    >
                      {activity.type === 'Call'
                        ? '☎'
                        : activity.type === 'Follow-up'
                        ? '↗'
                        : '✎'}
                    </div>

                    <div className="activity-preview-content">
                      <strong>{activity.title}</strong>

                      <span>{lead?.name || 'Unknown Lead'}</span>
                    </div>

                    <small>{activity.dueDate}</small>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>
    </>
  );
}

function StatusBadge({ status }: { status: LeadStatus }) {
  return (
    <span className={`status-badge ${getStatusClass(status)}`}>{status}</span>
  );
}

function LeadsPage({
  leads,
  onAdd,
  onUpdate,
  onDelete,
}: {
  leads: Lead[];
  onAdd: (lead: Omit<Lead, 'id' | 'createdAt'>) => void;
  onUpdate: (lead: Lead) => void;
  onDelete: (id: string) => void;
}) {
  const [showForm, setShowForm] = useState(false);

  const [editingLead, setEditingLead] = useState<Lead | null>(null);

  const [search, setSearch] = useState('');

  const [statusFilter, setStatusFilter] = useState<LeadStatus | 'All'>('All');

  const filteredLeads = useMemo(() => {
    const query = search.toLowerCase().trim();

    return leads.filter((lead) => {
      const matchesSearch =
        !query ||
        lead.name.toLowerCase().includes(query) ||
        lead.company.toLowerCase().includes(query) ||
        lead.email.toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === 'All' || lead.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [leads, search, statusFilter]);

  const openAdd = () => {
    setEditingLead(null);
    setShowForm(true);
  };

  const openEdit = (lead: Lead) => {
    setEditingLead(lead);
    setShowForm(true);
  };

  const handleSubmit = (data: Omit<Lead, 'id' | 'createdAt'>) => {
    if (editingLead) {
      onUpdate({
        ...editingLead,
        ...data,
      });
    } else {
      onAdd(data);
    }

    setShowForm(false);
    setEditingLead(null);
  };

  return (
    <>
      <PageHeader
        title="Lead Management"
        subtitle="Create, manage and track your sales leads."
        action={
          <button className="primary-button" onClick={openAdd}>
            + Add Lead
          </button>
        }
      />

      <div className="card">
        <div className="leads-toolbar">
          <div className="inner-search">
            <span>⌕</span>

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search leads..."
            />
          </div>

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as LeadStatus | 'All')
            }
          >
            <option value="All">All Statuses</option>

            {stages.map((stage) => (
              <option key={stage} value={stage}>
                {stage}
              </option>
            ))}
          </select>

          <div className="toolbar-count">{filteredLeads.length} leads</div>
        </div>

        <div className="table-wrap">
          <table className="leads-table">
            <thead>
              <tr>
                <th>Lead</th>
                <th>Company</th>
                <th>Contact</th>
                <th>Source</th>
                <th>Assigned</th>
                <th>Value</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredLeads.map((lead) => (
                <tr key={lead.id}>
                  <td>
                    <div className="lead-cell">
                      <div className="small-avatar">
                        {lead.name
                          .split(' ')
                          .map((item) => item[0])
                          .join('')
                          .slice(0, 2)}
                      </div>

                      <div>
                        <strong>{lead.name}</strong>

                        <span>
                          {lead.createdAt
                            ? new Date(lead.createdAt).toLocaleDateString(
                                'en-IN'
                              )
                            : ''}
                        </span>
                      </div>
                    </div>
                  </td>

                  <td>{lead.company}</td>

                  <td>
                    <div className="contact-cell">
                      <span>{lead.email}</span>

                      <span>{lead.phone}</span>
                    </div>
                  </td>

                  <td>{lead.source}</td>

                  <td>{lead.assignedUser || 'Unassigned'}</td>

                  <td>{formatCurrency(lead.value)}</td>

                  <td>
                    <StatusBadge status={lead.status} />
                  </td>

                  <td>
                    <div className="action-buttons">
                      <button
                        className="icon-button"
                        title="Edit"
                        onClick={() => openEdit(lead)}
                      >
                        ✎
                      </button>

                      <button
                        className="icon-button danger"
                        title="Delete"
                        onClick={() => onDelete(lead.id)}
                      >
                        ×
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredLeads.length === 0 && (
                <tr>
                  <td colSpan={8} className="empty-table">
                    No leads found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <LeadForm
          lead={editingLead}
          onClose={() => {
            setShowForm(false);
            setEditingLead(null);
          }}
          onSubmit={handleSubmit}
        />
      )}
    </>
  );
}

function LeadForm({
  lead,
  onClose,
  onSubmit,
}: {
  lead: Lead | null;
  onClose: () => void;
  onSubmit: (data: Omit<Lead, 'id' | 'createdAt'>) => void;
}) {
  const [form, setForm] = useState({
    name: lead?.name || '',
    company: lead?.company || '',
    email: lead?.email || '',
    phone: lead?.phone || '',
    source: lead?.source || 'Website',
    assignedUser: lead?.assignedUser || 'Shaik Zafferuddin',
    notes: lead?.notes || '',
    status: lead?.status || 'New',
    value: lead?.value?.toString() || '',
  });

  const updateField = (field: string, value: string) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();

    if (!form.name.trim() || !form.company.trim() || !form.email.trim()) {
      alert('Please fill in Name, Company and Email.');
      return;
    }

    onSubmit({
      name: form.name.trim(),
      company: form.company.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      source: form.source,
      assignedUser: form.assignedUser,
      notes: form.notes.trim(),
      status: form.status as LeadStatus,
      value: Number(form.value) || 0,
    });
  };

  return (
    <Modal title={lead ? 'Edit Lead' : 'Add New Lead'} onClose={onClose}>
      <form onSubmit={submit}>
        <div className="form-grid">
          <label className="form-field">
            <span>Lead Name</span>

            <input
              value={form.name}
              onChange={(event) => updateField('name', event.target.value)}
              placeholder="Enter name"
            />
          </label>

          <label className="form-field">
            <span>Company Name</span>

            <input
              value={form.company}
              onChange={(event) => updateField('company', event.target.value)}
              placeholder="Enter company"
            />
          </label>

          <label className="form-field">
            <span>Email</span>

            <input
              type="email"
              value={form.email}
              onChange={(event) => updateField('email', event.target.value)}
              placeholder="name@company.com"
            />
          </label>

          <label className="form-field">
            <span>Phone</span>

            <input
              value={form.phone}
              onChange={(event) => updateField('phone', event.target.value)}
              placeholder="+91..."
            />
          </label>

          <label className="form-field">
            <span>Lead Source</span>

            <select
              value={form.source}
              onChange={(event) => updateField('source', event.target.value)}
            >
              <option value="Website">Website</option>
              <option value="LinkedIn">LinkedIn</option>
              <option value="Referral">Referral</option>
              <option value="Cold Call">Cold Call</option>
              <option value="Email">Email</option>
              <option value="Other">Other</option>
            </select>
          </label>

          <label className="form-field">
            <span>Assigned User</span>

            <select
              value={form.assignedUser}
              onChange={(event) =>
                updateField('assignedUser', event.target.value)
              }
            >
              <option>Shaik Zafferuddin</option>
              <option>Sales Manager</option>
              <option>Support Team</option>
            </select>
          </label>

          <label className="form-field">
            <span>Status</span>

            <select
              value={form.status}
              onChange={(event) => updateField('status', event.target.value)}
            >
              {stages.map((stage) => (
                <option key={stage} value={stage}>
                  {stage}
                </option>
              ))}
            </select>
          </label>

          <label className="form-field">
            <span>Pipeline Value</span>

            <input
              type="number"
              min="0"
              value={form.value}
              onChange={(event) => updateField('value', event.target.value)}
              placeholder="0"
            />
          </label>

          <label className="form-field full-width">
            <span>Notes</span>

            <textarea
              rows={4}
              value={form.notes}
              onChange={(event) => updateField('notes', event.target.value)}
              placeholder="Lead notes..."
            />
          </label>
        </div>

        <div className="modal-actions">
          <button type="button" className="secondary-button" onClick={onClose}>
            Cancel
          </button>

          <button type="submit" className="primary-button">
            {lead ? 'Update Lead' : 'Create Lead'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function PipelinePage({
  leads,
  onMoveLead,
}: {
  leads: Lead[];
  onMoveLead: (leadId: string, status: LeadStatus) => void;
}) {
  const [draggedLead, setDraggedLead] = useState<string | null>(null);

  const handleDrop = (status: LeadStatus) => {
    if (draggedLead) {
      onMoveLead(draggedLead, status);
    }

    setDraggedLead(null);
  };

  return (
    <>
      <PageHeader
        title="Sales Pipeline"
        subtitle="Drag and drop leads through your sales stages."
      />

      <div className="pipeline-board">
        {stages.map((stage) => {
          const stageLeads = leads.filter((lead) => lead.status === stage);

          const stageValue = stageLeads.reduce(
            (sum, lead) => sum + lead.value,
            0
          );

          return (
            <div
              className="pipeline-column"
              key={stage}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => handleDrop(stage)}
            >
              <div className="pipeline-column-header">
                <div>
                  <strong>{stage}</strong>
                  <span>{stageLeads.length} leads</span>
                </div>

                <small>{formatCurrency(stageValue)}</small>
              </div>

              <div className="pipeline-cards">
                {stageLeads.map((lead) => (
                  <div
                    className="pipeline-card"
                    key={lead.id}
                    draggable
                    onDragStart={() => setDraggedLead(lead.id)}
                    onDragEnd={() => setDraggedLead(null)}
                  >
                    <div className="pipeline-card-top">
                      <div className="small-avatar">
                        {lead.name
                          .split(' ')
                          .map((item) => item[0])
                          .join('')
                          .slice(0, 2)}
                      </div>

                      <StatusBadge status={lead.status} />
                    </div>

                    <strong>{lead.name}</strong>

                    <span>{lead.company}</span>

                    <div className="pipeline-card-bottom">
                      <span>{formatCurrency(lead.value)}</span>

                      <small>{lead.source}</small>
                    </div>
                  </div>
                ))}

                {stageLeads.length === 0 && (
                  <div className="pipeline-empty">Drop leads here</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function ActivitiesPage({
  leads,
  activities,
  onAdd,
  onUpdate,
  onDelete,
  onToggle,
}: {
  leads: Lead[];
  activities: Activity[];
  onAdd: (activity: Omit<Activity, 'id' | 'createdAt'>) => void;
  onUpdate: (activity: Activity) => void;
  onDelete: (id: number) => void;
  onToggle: (id: number) => void;
}) {
  const [showForm, setShowForm] = useState(false);

  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);

  const [filter, setFilter] = useState<'All' | 'Pending' | 'Completed'>('All');

  const filteredActivities = activities.filter((activity) => {
    if (filter === 'Pending') {
      return !activity.completed;
    }

    if (filter === 'Completed') {
      return activity.completed;
    }

    return true;
  });

  const handleSubmit = (data: Omit<Activity, 'id' | 'createdAt'>) => {
    if (editingActivity) {
      onUpdate({
        ...editingActivity,
        ...data,
      });
    } else {
      onAdd(data);
    }

    setShowForm(false);
    setEditingActivity(null);
  };

  return (
    <>
      <PageHeader
        title="Activities"
        subtitle="Manage calls, notes and follow-ups."
        action={
          <button
            className="primary-button"
            onClick={() => {
              setEditingActivity(null);
              setShowForm(true);
            }}
          >
            + Add Activity
          </button>
        }
      />

      <div className="card">
        <div className="activities-toolbar">
          <div className="filter-buttons">
            <button
              className={`filter-button ${filter === 'All' ? 'active' : ''}`}
              onClick={() => setFilter('All')}
            >
              All
            </button>

            <button
              className={`filter-button ${
                filter === 'Pending' ? 'active' : ''
              }`}
              onClick={() => setFilter('Pending')}
            >
              Pending
            </button>

            <button
              className={`filter-button ${
                filter === 'Completed' ? 'active' : ''
              }`}
              onClick={() => setFilter('Completed')}
            >
              Completed
            </button>
          </div>

          <span className="toolbar-count">
            {filteredActivities.length} activities
          </span>
        </div>

        <div className="activities-list">
          {filteredActivities.map((activity) => {
            const lead = leads.find((item) => item.id === activity.leadId);

            return (
              <div
                className={`activity-row ${
                  activity.completed ? 'completed' : ''
                }`}
                key={activity.id}
              >
                <button
                  className={`check-button ${
                    activity.completed ? 'checked' : ''
                  }`}
                  onClick={() => onToggle(activity.id)}
                >
                  {activity.completed ? '✓' : ''}
                </button>

                <div
                  className={`activity-type-icon ${activity.type.toLowerCase()}`}
                >
                  {activity.type === 'Call'
                    ? '☎'
                    : activity.type === 'Follow-up'
                    ? '↗'
                    : '✎'}
                </div>

                <div className="activity-main">
                  <strong>{activity.title}</strong>

                  <span>
                    {lead?.name || 'Unknown Lead'} • {lead?.company || ''}
                  </span>

                  {activity.description && <p>{activity.description}</p>}
                </div>

                <div className="activity-meta">
                  <span>{activity.type}</span>

                  <strong>{activity.dueDate}</strong>

                  <small>{activity.assignedUser}</small>
                </div>

                <div className="action-buttons">
                  <button
                    className="icon-button"
                    onClick={() => {
                      setEditingActivity(activity);
                      setShowForm(true);
                    }}
                  >
                    ✎
                  </button>

                  <button
                    className="icon-button danger"
                    onClick={() => onDelete(activity.id)}
                  >
                    ×
                  </button>
                </div>
              </div>
            );
          })}

          {filteredActivities.length === 0 && (
            <div className="empty-state">No activities found.</div>
          )}
        </div>
      </div>

      {showForm && (
        <ActivityForm
          leads={leads}
          activity={editingActivity}
          onClose={() => {
            setShowForm(false);
            setEditingActivity(null);
          }}
          onSubmit={handleSubmit}
        />
      )}
    </>
  );
}

function ActivityForm({
  leads,
  activity,
  onClose,
  onSubmit,
}: {
  leads: Lead[];
  activity: Activity | null;
  onClose: () => void;
  onSubmit: (activity: Omit<Activity, 'id' | 'createdAt'>) => void;
}) {
  const [form, setForm] = useState({
    leadId: activity?.leadId || leads[0]?.id || '',
    type: activity?.type || 'Follow-up',
    title: activity?.title || '',
    description: activity?.description || '',
    dueDate: activity?.dueDate || new Date().toISOString().slice(0, 10),
    assignedUser: activity?.assignedUser || 'Shaik Zafferuddin',
    completed: activity?.completed || false,
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();

    if (!form.leadId) {
      alert('Please select a lead.');
      return;
    }

    if (!form.title.trim()) {
      alert('Please enter an activity title.');
      return;
    }

    onSubmit({
      leadId: form.leadId,
      type: form.type as ActivityType,
      title: form.title.trim(),
      description: form.description.trim(),
      dueDate: form.dueDate,
      assignedUser: form.assignedUser,
      completed: form.completed,
    });
  };

  return (
    <Modal
      title={activity ? 'Edit Activity' : 'Add Activity'}
      onClose={onClose}
    >
      <form onSubmit={submit}>
        <div className="form-grid">
          <label className="form-field">
            <span>Lead</span>

            <select
              value={form.leadId}
              onChange={(event) =>
                setForm((previous) => ({
                  ...previous,
                  leadId: event.target.value,
                }))
              }
            >
              {leads.length === 0 && (
                <option value="">No leads available</option>
              )}

              {leads.map((lead) => (
                <option key={lead.id} value={lead.id}>
                  {lead.name} - {lead.company}
                </option>
              ))}
            </select>
          </label>

          <label className="form-field">
            <span>Activity Type</span>

            <select
              value={form.type}
              onChange={(event) =>
                setForm((previous) => ({
                  ...previous,
                  type: event.target.value,
                }))
              }
            >
              {activityTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>

          <label className="form-field">
            <span>Title</span>

            <input
              value={form.title}
              onChange={(event) =>
                setForm((previous) => ({
                  ...previous,
                  title: event.target.value,
                }))
              }
              placeholder="e.g. Follow up with customer"
            />
          </label>

          <label className="form-field">
            <span>Due Date</span>

            <input
              type="date"
              value={form.dueDate}
              onChange={(event) =>
                setForm((previous) => ({
                  ...previous,
                  dueDate: event.target.value,
                }))
              }
            />
          </label>

          <label className="form-field">
            <span>Assigned User</span>

            <select
              value={form.assignedUser}
              onChange={(event) =>
                setForm((previous) => ({
                  ...previous,
                  assignedUser: event.target.value,
                }))
              }
            >
              <option>Shaik Zafferuddin</option>

              <option>Sales Manager</option>

              <option>Support Team</option>
            </select>
          </label>
        </div>

        <label className="form-field full-width">
          <span>Description</span>

          <textarea
            rows={4}
            value={form.description}
            onChange={(event) =>
              setForm((previous) => ({
                ...previous,
                description: event.target.value,
              }))
            }
            placeholder="Activity details..."
          />
        </label>

        <label className="checkbox-field">
          <input
            type="checkbox"
            checked={form.completed}
            onChange={(event) =>
              setForm((previous) => ({
                ...previous,
                completed: event.target.checked,
              }))
            }
          />
          Mark as completed
        </label>

        <div className="modal-actions">
          <button type="button" className="secondary-button" onClick={onClose}>
            Cancel
          </button>

          <button type="submit" className="primary-button">
            {activity ? 'Update Activity' : 'Create Activity'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ReportsPage({ leads }: { leads: Lead[] }) {
  const [startDate, setStartDate] = useState('');

  const [endDate, setEndDate] = useState('');

  const filteredReportLeads = useMemo(() => {
    return leads.filter((lead) => {
      const leadDate = lead.createdAt.slice(0, 10);

      if (startDate && leadDate < startDate) {
        return false;
      }

      if (endDate && leadDate > endDate) {
        return false;
      }

      return true;
    });
  }, [leads, startDate, endDate]);

  const sourceMap: Record<string, number> = {};

  filteredReportLeads.forEach((lead) => {
    sourceMap[lead.source] = (sourceMap[lead.source] || 0) + 1;
  });

  const sources = Object.entries(sourceMap);

  const salesMap: Record<string, number> = {};

  filteredReportLeads.forEach((lead) => {
    const user = lead.assignedUser || 'Unassigned';

    salesMap[user] = (salesMap[user] || 0) + lead.value;
  });

  const salesPerformance = Object.entries(salesMap);

  const filteredWonDeals = filteredReportLeads.filter(
    (lead) => lead.status === 'Won'
  );

  const filteredLostDeals = filteredReportLeads.filter(
    (lead) => lead.status === 'Lost'
  );

  const filteredQualifiedLeads = filteredReportLeads.filter(
    (lead) =>
      lead.status === 'Qualified' ||
      lead.status === 'Proposal Sent' ||
      lead.status === 'Negotiation'
  );

  const filteredPipelineValue = filteredReportLeads
    .filter((lead) => lead.status !== 'Won' && lead.status !== 'Lost')
    .reduce((sum, lead) => sum + lead.value, 0);

  const filteredRevenue = filteredWonDeals.reduce(
    (sum, lead) => sum + lead.value,
    0
  );

  const filteredConversionRate =
    filteredReportLeads.length > 0
      ? Math.round((filteredWonDeals.length / filteredReportLeads.length) * 100)
      : 0;

  const clearFilters = () => {
    setStartDate('');
    setEndDate('');
  };

  return (
    <>
      <PageHeader
        title="Reports"
        subtitle="Analyze lead sources, sales performance and revenue."
      />

      <div className="card report-filters">
        <div className="report-filter-title">
          <div>
            <h3>Date Filters</h3>
            <p>Filter reports by lead creation date</p>
          </div>

          {(startDate || endDate) && (
            <button className="secondary-button" onClick={clearFilters}>
              Clear Filters
            </button>
          )}
        </div>

        <div className="report-filter-fields">
          <label>
            Start Date
            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
            />
          </label>

          <label>
            End Date
            <input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
            />
          </label>

          <div className="report-filter-result">
            <span>Matching Leads</span>

            <strong>{filteredReportLeads.length}</strong>
          </div>
        </div>
      </div>

      <div className="reports-grid">
        <section className="card report-card">
          <div className="card-header">
            <div>
              <h2>Lead Sources</h2>
              <p>Leads by acquisition source</p>
            </div>
          </div>

          <div className="report-list">
            {sources.map(([source, count]) => (
              <div className="report-row" key={source}>
                <span>{source}</span>
                <strong>{count}</strong>
              </div>
            ))}

            {sources.length === 0 && (
              <div className="empty-state">No source data.</div>
            )}
          </div>
        </section>

        <section className="card report-card">
          <div className="card-header">
            <div>
              <h2>Sales Performance</h2>
              <p>Pipeline value by user</p>
            </div>
          </div>

          <div className="report-list">
            {salesPerformance.map(([user, value]) => (
              <div className="report-row" key={user}>
                <span>{user}</span>

                <strong>{formatCurrency(value)}</strong>
              </div>
            ))}

            {salesPerformance.length === 0 && (
              <div className="empty-state">No sales data.</div>
            )}
          </div>
        </section>

        <section className="card report-card">
          <div className="card-header">
            <div>
              <h2>Conversion Rates</h2>
              <p>Funnel performance</p>
            </div>
          </div>

          <div className="conversion-report">
            <div>
              <span>Total Leads</span>
              <strong>{filteredReportLeads.length}</strong>
            </div>

            <div>
              <span>Qualified</span>
              <strong>{filteredQualifiedLeads.length}</strong>
            </div>

            <div>
              <span>Won</span>
              <strong>{filteredWonDeals.length}</strong>
            </div>

            <div>
              <span>Lost</span>
              <strong>{filteredLostDeals.length}</strong>
            </div>

            <div>
              <span>Conversion</span>
              <strong>{filteredConversionRate}%</strong>
            </div>
          </div>
        </section>

        <section className="card report-card revenue-card">
          <div className="card-header">
            <div>
              <h2>Revenue Summary</h2>
              <p>Financial overview for selected period</p>
            </div>
          </div>

          <div className="revenue-summary">
            <div>
              <span>Won Revenue</span>

              <strong>{formatCurrency(filteredRevenue)}</strong>
            </div>

            <div>
              <span>Open Pipeline</span>

              <strong>{formatCurrency(filteredPipelineValue)}</strong>
            </div>

            <div>
              <span>Potential Total</span>

              <strong>
                {formatCurrency(filteredRevenue + filteredPipelineValue)}
              </strong>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

function AIPage({
  leads,
  activities,
}: {
  leads: Lead[];
  activities: Activity[];
}) {
  const qualified = leads.filter((lead) => lead.status === 'Qualified');

  const proposalLeads = leads.filter((lead) => lead.status === 'Proposal Sent');

  const pendingActivities = activities.filter(
    (activity) => !activity.completed
  );

  const highestValueLead = [...leads].sort((a, b) => b.value - a.value)[0];

  const openPipeline = leads
    .filter((lead) => lead.status !== 'Won' && lead.status !== 'Lost')
    .reduce((sum, lead) => sum + lead.value, 0);

  return (
    <>
      <PageHeader
        title="AI Insights"
        subtitle="AI-assisted summaries and next-best-action recommendations."
      />

      <div className="ai-banner">
        <div className="ai-banner-icon">✦</div>

        <div>
          <strong>CRM AI Assistant</strong>

          <p>
            Use lead data and activity information to identify opportunities and
            recommended actions.
          </p>
        </div>
      </div>

      <div className="ai-grid">
        <section className="card">
          <div className="card-header">
            <div>
              <h2>Lead Summary</h2>
              <p>Current sales overview</p>
            </div>
          </div>

          <div className="ai-summary">
            <p>
              There are <strong>{leads.length}</strong> total leads, with{' '}
              <strong>{qualified.length}</strong> qualified or active
              opportunities.
            </p>

            <p>
              Current open pipeline is{' '}
              <strong>{formatCurrency(openPipeline)}</strong>.
            </p>

            {highestValueLead && (
              <p>
                Highest-value opportunity:{' '}
                <strong>{highestValueLead.name}</strong> at{' '}
                <strong>{formatCurrency(highestValueLead.value)}</strong>.
              </p>
            )}
          </div>
        </section>

        <section className="card">
          <div className="card-header">
            <div>
              <h2>Next Best Actions</h2>
              <p>Recommended sales follow-ups</p>
            </div>
          </div>

          <div className="insight-list">
            <div className="insight-box">
              <strong>Follow Up</strong>

              <span>
                {proposalLeads.length} proposal-stage opportunities need
                follow-up.
              </span>
            </div>

            <div className="insight-box">
              <strong>Activity Attention</strong>

              <span>
                {pendingActivities.length} pending activities require attention.
              </span>
            </div>

            <div className="insight-box">
              <strong>Highest Value</strong>

              <span>
                {highestValueLead
                  ? `${highestValueLead.name} — ${formatCurrency(
                      highestValueLead.value
                    )}`
                  : 'No leads available.'}
              </span>
            </div>
          </div>
        </section>

        <section className="card">
          <div className="card-header">
            <div>
              <h2>Sales Insights</h2>
              <p>Data-driven observations</p>
            </div>
          </div>

          <div className="insight-list">
            <div className="insight-box">
              <strong>Pipeline Opportunity</strong>

              <span>
                {formatCurrency(openPipeline)} remains in open pipeline.
              </span>
            </div>

            <div className="insight-box">
              <strong>Proposal Risk</strong>

              <span>
                {proposalLeads.length} opportunities require proposal follow-up.
              </span>
            </div>

            <div className="insight-box">
              <strong>Activity Attention</strong>

              <span>
                {pendingActivities.length} pending activities require attention.
              </span>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

function AuditLogsPage({ logs }: { logs: AuditLog[] }) {
  return (
    <>
      <PageHeader
        title="Audit Logs"
        subtitle="Track important changes made in the CRM."
      />

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Action</th>
                <th>Entity</th>
                <th>Details</th>
                <th>User</th>
                <th>Timestamp</th>
              </tr>
            </thead>

            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td>
                    <span className="audit-action">{log.action}</span>
                  </td>

                  <td>{log.entity}</td>

                  <td>{log.details}</td>

                  <td>{log.user}</td>

                  <td>{log.timestamp}</td>
                </tr>
              ))}

              {logs.length === 0 && (
                <tr>
                  <td colSpan={5} className="empty-table">
                    No audit logs available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="modal-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="modal">
        <div className="modal-header">
          <div>
            <h2>{title}</h2>

            <p>Enter the required information below.</p>
          </div>

          <button type="button" className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

export default App;
