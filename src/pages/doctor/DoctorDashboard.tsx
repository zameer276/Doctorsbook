import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, orderBy } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Calendar, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  MessageSquare, 
  User,
  Filter,
  ChevronRight,
  MoreVertical,
  Stethoscope
} from 'lucide-react';
import StatusBadge from '../../components/StatusBadge';
import { format } from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  date: string;
  time: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  notes?: string;
  createdAt: string;
}

export default function DoctorDashboard() {
  const { profile } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!profile?.uid) return;

    const q = query(
      collection(db, 'appointments'),
      where('doctorId', '==', profile.uid),
      orderBy('date', 'asc'),
      orderBy('time', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setAppointments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment)));
      setLoading(false);
    }, (error) => {
      console.error("Error fetching doctor appointments:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [profile?.uid]);

  const handleUpdateStatus = async (id: string, status: Appointment['status']) => {
    try {
      await updateDoc(doc(db, 'appointments', id), { 
        status,
        notes: notes || undefined,
        updatedAt: new Date().toISOString()
      });
      setSelectedAppointment(null);
      setNotes('');
    } catch (error) {
      console.error("Error updating appointment status:", error);
    }
  };

  const filteredAppointments = appointments.filter(a => 
    filterStatus === 'all' ? true : a.status === filterStatus
  );

  const stats = [
    { label: 'Today\'s Appointments', value: appointments.filter(a => a.date === format(new Date(), 'yyyy-MM-dd')).length, icon: Calendar, color: 'bg-indigo-50 text-indigo-600' },
    { label: 'Pending Approval', value: appointments.filter(a => a.status === 'pending').length, icon: Clock, color: 'bg-amber-50 text-amber-600' },
    { label: 'Completed', value: appointments.filter(a => a.status === 'completed').length, icon: CheckCircle2, color: 'bg-emerald-50 text-emerald-600' },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Doctor Dashboard</h1>
          <p className="text-slate-500">Manage your patient appointments and schedules</p>
        </div>
        <div className="flex items-center gap-3 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
          {['all', 'pending', 'approved', 'completed'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={cn(
                "px-4 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all",
                filterStatus === status 
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-100" 
                  : "text-slate-500 hover:bg-slate-50"
              )}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", stat.color)}>
              <stat.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">{stat.label}</p>
              <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Appointments List */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">Recent Appointments</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {filteredAppointments.map((appointment) => (
            <div key={appointment.id} className="p-6 hover:bg-slate-50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500 flex-shrink-0">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">{appointment.patientName}</h3>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Calendar className="w-3.5 h-3.5" />
                      {format(new Date(appointment.date), 'MMM dd, yyyy')}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Clock className="w-3.5 h-3.5" />
                      {appointment.time}
                    </div>
                  </div>
                  {appointment.notes && (
                    <div className="mt-3 p-3 bg-indigo-50 rounded-lg border border-indigo-100 flex gap-2">
                      <MessageSquare className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-indigo-700 italic">"{appointment.notes}"</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <StatusBadge status={appointment.status} />
                
                {appointment.status !== 'completed' && appointment.status !== 'rejected' && (
                  <div className="flex items-center gap-2">
                    {appointment.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleUpdateStatus(appointment.id, 'approved')}
                          className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                          title="Approve"
                        >
                          <CheckCircle2 className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(appointment.id, 'rejected')}
                          className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                          title="Reject"
                        >
                          <XCircle className="w-5 h-5" />
                        </button>
                      </>
                    )}
                    {appointment.status === 'approved' && (
                      <button
                        onClick={() => setSelectedAppointment(appointment)}
                        className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100"
                      >
                        Complete Session
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}

          {filteredAppointments.length === 0 && (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8 text-slate-300" />
              </div>
              <p className="text-slate-500 font-medium">No appointments found for this filter.</p>
            </div>
          )}
        </div>
      </div>

      {/* Complete Session Modal */}
      {selectedAppointment && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectedAppointment(null)} />
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative z-10 overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-xl font-bold text-slate-900">Complete Session</h3>
              <p className="text-sm text-slate-500 mt-1">Add session notes for {selectedAppointment.patientName}</p>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Medical Notes / Prescription</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none text-sm"
                  placeholder="Enter diagnosis, advice, or prescription details..."
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setSelectedAppointment(null)}
                  className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl font-semibold hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleUpdateStatus(selectedAppointment.id, 'completed')}
                  className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                >
                  Mark Completed
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
