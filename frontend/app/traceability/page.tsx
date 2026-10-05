'use client';

import { useState } from 'react';
import { 
  GitBranch, 
  Search, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Filter, 
  Layers, 
  FileText, 
  Link as LinkIcon,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

interface Requirement {
  id: string;
  title: string;
  description: string;
  status: 'VERIFIED' | 'PARTIAL' | 'UNVERIFIED';
  linked_assertions: string[];
  linked_tests: string[];
  coverage_percentage: number;
}

const defaultRequirements: Requirement[] = [
  {
    id: 'REQ-FIFO-001',
    title: 'Data Integrity & Ordering',
    description: 'Data written to the FIFO must be read out in strict First-In-First-Out order without corruption.',
    status: 'VERIFIED',
    linked_assertions: ['a_wr_ptr_increments', 'a_rd_ptr_increments'],
    linked_tests: ['tb_fifo_basic.sv', 'tb_fifo_sweep.sv'],
    coverage_percentage: 100,
  },
  {
    id: 'REQ-FIFO-002',
    title: 'Full Condition Overflow Guard',
    description: 'When the FIFO is full, further write requests (wr_en) must be ignored and not overwrite valid data.',
    status: 'VERIFIED',
    linked_assertions: ['a_no_write_when_full', 'p_full_empty_mutex'],
    linked_tests: ['tb_fifo_fifo.sv', 'tb_fifo_random.sv'],
    coverage_percentage: 100,
  },
  {
    id: 'REQ-FIFO-003',
    title: 'Empty Condition Underflow Guard',
    description: 'When the FIFO is empty, read requests (rd_en) must not alter read pointer or return invalid data.',
    status: 'PARTIAL',
    linked_assertions: ['a_no_read_when_empty'],
    linked_tests: ['tb_fifo_basic.sv'],
    coverage_percentage: 65,
  },
  {
    id: 'REQ-FIFO-004',
    title: 'Synchronous Reset Behavior',
    description: 'Asserting reset synchronously sets write/read pointers and occupancy count to 0 and empty flag high.',
    status: 'VERIFIED',
    linked_assertions: ['a_reset'],
    linked_tests: ['tb_fifo_reset.sv'],
    coverage_percentage: 100,
  },
  {
    id: 'REQ-FIFO-005',
    title: 'Concurrent Read & Write Operations',
    description: 'Simultaneous wr_en and rd_en when non-full and non-empty must properly update pointers and retain count.',
    status: 'UNVERIFIED',
    linked_assertions: [],
    linked_tests: ['tb_fifo_handshake.sv'],
    coverage_percentage: 20,
  },
];

export default function TraceabilityPage() {
  const [requirements, setRequirements] = useState<Requirement[]>(defaultRequirements);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'VERIFIED' | 'PARTIAL' | 'UNVERIFIED'>('ALL');
  const [loading, setLoading] = useState(false);
  const [selectedReq, setSelectedReq] = useState<Requirement | null>(defaultRequirements[0]);

  const handleFetchTraceability = async () => {
    setLoading(true);
    try {
      const res = await api.get('/traceability/matrix');
      if (res.data && Array.isArray(res.data)) {
        setRequirements(res.data);
        setSelectedReq(res.data[0] || null);
      }
      toast.success('Traceability matrix updated');
    } catch (error: any) {
      console.error('Traceability fetch failed:', error);
      toast.error(error.response?.data?.detail || 'Loaded active traceability matrix');
    } finally {
      setLoading(false);
    }
  };

  const filteredRequirements = requirements.filter((req) => {
    const matchesSearch =
      req.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || req.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: Requirement['status']) => {
    switch (status) {
      case 'VERIFIED':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-200 border border-amber-400 text-amber-950">
            <CheckCircle className="w-3 h-3 text-amber-900" />
            VERIFIED
          </span>
        );
      case 'PARTIAL':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 border border-amber-300 text-amber-900">
            <AlertCircle className="w-3 h-3 text-amber-800" />
            PARTIAL
          </span>
        );
      case 'UNVERIFIED':
      default:
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-50 border border-amber-200 text-amber-800">
            <XCircle className="w-3 h-3 text-amber-700" />
            UNVERIFIED
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] min-h-[700px] w-full bg-amber-50/60 backdrop-blur-md rounded-2xl border border-amber-300/80 shadow-[0_6px_24px_rgba(180,130,20,0.15)] overflow-hidden font-sans text-amber-950">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-amber-200/90 bg-gradient-to-r from-amber-100/90 via-amber-50 to-amber-100/90 shrink-0">
        <div className="flex items-center gap-3">
          <GitBranch className="w-6 h-6 text-amber-900" />
          <div>
            <h1 className="text-lg font-black text-amber-950 tracking-tight">Traceability Matrix</h1>
            <p className="text-xs font-semibold text-amber-800/80">Requirement Specification to Assertion & Test Mapping</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleFetchTraceability}
            disabled={loading}
            className="px-4 py-2 bg-amber-400 hover:bg-amber-500 text-amber-950 font-black rounded-xl text-sm shadow-md border border-amber-400/80 flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={cn('w-4 h-4 text-amber-950', loading && 'animate-spin')} />
            {loading ? 'Refreshing...' : 'Refresh Matrix'}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 p-6 overflow-auto bg-amber-50/30">
        {/* Left Column: Filter & Requirement List */}
        <div className="space-y-4 flex flex-col h-full">
          <div className="bg-white border border-amber-200/90 rounded-2xl p-3 shadow-sm space-y-3 shrink-0">
            <div className="relative">
              <Search className="w-4 h-4 text-amber-800/60 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search requirements..."
                className="w-full pl-9 pr-3 py-1.5 bg-amber-50/30 border border-amber-300 focus:border-amber-500 rounded-xl text-xs font-bold text-amber-950 outline-none"
              />
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-black text-amber-900/80 flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-amber-700" /> Filter Status
              </span>
              <select
                value={statusFilter}
                onChange={(e: any) => setStatusFilter(e.target.value)}
                className="px-2 py-1 bg-white border border-amber-300 rounded-lg text-xs font-bold text-amber-950 outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="VERIFIED">Verified</option>
                <option value="PARTIAL">Partial</option>
                <option value="UNVERIFIED">Unverified</option>
              </select>
            </div>
          </div>

          {/* Requirement Items List */}
          <div className="bg-white border border-amber-200/90 rounded-2xl shadow-sm overflow-hidden flex-1 flex flex-col min-h-[350px]">
            <div className="border-b border-amber-200/90 px-4 py-2.5 bg-amber-100/60 flex items-center justify-between shrink-0">
              <span className="font-black text-xs uppercase tracking-wider text-amber-950">
                Specifications ({filteredRequirements.length})
              </span>
            </div>
            <div className="p-3 space-y-2 overflow-y-auto flex-1">
              {filteredRequirements.map((req) => (
                <div
                  key={req.id}
                  onClick={() => setSelectedReq(req)}
                  className={cn(
                    'p-3 rounded-xl border transition-all cursor-pointer shadow-sm space-y-2',
                    selectedReq?.id === req.id
                      ? 'bg-gradient-to-r from-amber-100 to-amber-50 border-amber-400 shadow-md'
                      : 'bg-white border-amber-200/80 hover:border-amber-300 hover:bg-amber-50/40'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-black text-amber-950">{req.id}</span>
                    {getStatusBadge(req.status)}
                  </div>
                  <h4 className="text-xs font-bold text-amber-950 line-clamp-1">{req.title}</h4>
                  <div className="w-full bg-amber-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-amber-500 h-full rounded-full transition-all duration-300"
                      style={{ width: `${req.coverage_percentage}%` }}
                    />
                  </div>
                </div>
              ))}
              {filteredRequirements.length === 0 && (
                <div className="text-center py-12 text-amber-800/60 text-xs font-bold">
                  No matching requirements found
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Detailed Traceability Breakdown */}
        <div className="lg:col-span-2 space-y-4 flex flex-col h-full">
          {selectedReq ? (
            <div className="bg-white border border-amber-200/90 rounded-2xl shadow-sm overflow-hidden flex-1 flex flex-col">
              {/* Card Banner */}
              <div className="border-b border-amber-200/90 px-5 py-4 bg-gradient-to-r from-amber-100/80 via-amber-50 to-white flex items-center justify-between shrink-0">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-black text-amber-950">{selectedReq.id}</span>
                    {getStatusBadge(selectedReq.status)}
                  </div>
                  <h2 className="text-base font-black text-amber-950">{selectedReq.title}</h2>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black font-mono text-amber-950">
                    {selectedReq.coverage_percentage}%
                  </div>
                  <div className="text-[10px] font-black text-amber-900/80 uppercase tracking-wider">
                    Trace Coverage
                  </div>
                </div>
              </div>

              {/* Requirement Description */}
              <div className="p-5 space-y-5 overflow-y-auto flex-1">
                <div className="p-4 bg-amber-50/40 border border-amber-200/80 rounded-xl space-y-1.5">
                  <h3 className="text-xs font-black text-amber-900/80 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-amber-700" />
                    Requirement Specification
                  </h3>
                  <p className="text-xs font-medium text-amber-950 leading-relaxed">
                    {selectedReq.description}
                  </p>
                </div>

                {/* Linked SystemVerilog Assertions */}
                <div className="space-y-2">
                  <h3 className="text-xs font-black text-amber-900/80 uppercase tracking-wider flex items-center gap-1.5">
                    <LinkIcon className="w-3.5 h-3.5 text-amber-700" />
                    Linked Formal Assertions ({selectedReq.linked_assertions.length})
                  </h3>
                  {selectedReq.linked_assertions.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {selectedReq.linked_assertions.map((ast, i) => (
                        <div
                          key={i}
                          className="p-2.5 bg-white border border-amber-200/90 rounded-xl flex items-center justify-between shadow-sm"
                        >
                          <span className="font-mono text-xs font-bold text-amber-950">{ast}</span>
                          <span className="px-2 py-0.5 text-[10px] font-black bg-amber-100 border border-amber-300 text-amber-900 rounded-md">
                            SVA Property
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3 bg-amber-50/30 border border-amber-200/60 rounded-xl text-xs font-medium text-amber-800/70 italic">
                      No assertions explicitly mapped to this requirement yet.
                    </div>
                  )}
                </div>

                {/* Linked Testbench Files */}
                <div className="space-y-2">
                  <h3 className="text-xs font-black text-amber-900/80 uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-amber-700" />
                    Linked Testbench Scenarios ({selectedReq.linked_tests.length})
                  </h3>
                  {selectedReq.linked_tests.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {selectedReq.linked_tests.map((test, i) => (
                        <div
                          key={i}
                          className="p-2.5 bg-white border border-amber-200/90 rounded-xl flex items-center justify-between shadow-sm"
                        >
                          <span className="font-mono text-xs font-bold text-amber-950">{test}</span>
                          <span className="px-2 py-0.5 text-[10px] font-black bg-amber-200 border border-amber-300 text-amber-950 rounded-md">
                            Testbench
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3 bg-amber-50/30 border border-amber-200/60 rounded-xl text-xs font-medium text-amber-800/70 italic">
                      No tests linked to this specification item.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-amber-200/90 rounded-2xl p-12 text-center text-amber-900/60 flex-1 flex flex-col items-center justify-center">
              <GitBranch className="w-12 h-12 mb-3 opacity-40 text-amber-700" />
              <p className="font-bold text-xs">Select a requirement on the left to inspect its complete traceability map</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}