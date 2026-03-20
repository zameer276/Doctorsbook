import React, { useEffect, useState } from 'react';
import { collection, query, onSnapshot, getDocs, doc, deleteDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { 
  Users, 
  Calendar, 
  UserPlus, 
  Trash2, 
  Edit, 
  Search, 
  Plus, 
  X,
  CheckCircle2,
  AlertCircle,
  Stethoscope
} from 'lucide-react';
import StatusBadge from '../../components/StatusBadge';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Doctor {
  uid: string;
  name: string;
  specialization: string;
  email: string;
  availability: {
    days: string[];
    timeSlots: string[];
  };
}

interface Appointment {
  id: string;
  patientName: string;
  doctorName: string;
  date: string;
  time: string;
  status: string;
}

export default function AdminDashboard() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    specialization: '',
    days: [] as string[],
    timeSlots: [] as string[],
  });

  useEffect(() => {
    const doctorsQuery = query(collection(db, 'doctors'));
    const appointmentsQuery = query(collection(db, 'appointments'));

    const unsubDoctors = onSnapshot(doctorsQuery, (snapshot) => {
      setDoctors(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as Doctor)));
    });

    const unsubAppointments = onSnapshot(appointmentsQuery, (snapshot) => {
      setAppointments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment)));
      setLoading(false);
    });

    return () => {
      unsubDoctors();
      unsubAppointments();
    };
  }, []);

  const handleAddDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const doctorId = editingDoctor ? editingDoctor.uid : Math.random().toString(36).substring(7);
      const doctorData = {
        uid: doctorId,
        name: formData.name,
        email: formData.email,
        specialization: formData.specialization,
        availability: {
          days: formData.days,
          timeSlots: formData.timeSlots,
        },
        createdBy: auth.currentUser?.uid,
        createdAt: new Date().toISOString(),
      };

      if (editingDoctor) {
        await updateDoc(doc(db, 'doctors', doctorId), doctorData);
        // Also update the user role if needed (though admin usually creates doctor accounts manually)
      } else {
        await setDoc(doc(db, 'doctors', doctorId), doctorData);
        // In a real app, you'd also create a Firebase Auth user for the doctor
        // For this demo, we'll assume the doctor profile is enough or created via a cloud function
        await setDoc(doc(db, 'users', doctorId), {
          uid: doctorId,
          name: formData.name,
          email: formData.email,
          role: 'doctor',
          createdAt: new Date().toISOString(),
        });
      }

      setIsModalOpen(false);
      setEditingDoctor(null);
      setFormData({ name: '', email: '', specialization: '', days: [], timeSlots: [] });
    } catch (error) {
      console.error("Error adding/updating doctor:", error);
    }
  };

  const handleDeleteDoctor = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this doctor?')) {
      try {
        await deleteDoc(doc(db, 'doctors', id));
        await deleteDoc(doc(db, 'users', id));
      } catch (error) {
        console.error("Error deleting doctor:", error);
      }
    }
  };

  const openEditModal = (doctor: Doctor) => {
    setEditingDoctor(doctor);
    setFormData({
      name: doctor.name,
      email: doctor.email,
      specialization: doctor.specialization,
      days: doctor.availability.days,
      timeSlots: doctor.availability.timeSlots,
    });
    setIsModalOpen(true);
  };

  const filteredDoctors = doctors.filter(d => 
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    d.specialization.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = [
    { label: 'Total Doctors', value: doctors.length, icon: Stethoscope, color: 'bg-indigo-50 text-indigo-600' },
    { label: 'Total Appointments', value: appointments.length, icon: Calendar, color: 'bg-emerald-50 text-emerald-600' },
    { label: 'Pending Requests', value: appointments.filter(a => a.status === 'pending').length, icon: Clock, color: 'bg-amber-50 text-amber-600' },
  ];

  function Clock({ className }: { className?: string }) {
    return <Calendar className={className} />; // Fallback icon
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
          <p className="text-slate-500">Overview of your clinic's operations</p>
        </div>
        <button
          onClick={() => {
            setEditingDoctor(null);
            setFormData({ name: '', email: '', specialization: '', days: [], timeSlots: [] });
            setIsModalOpen(true);
          }}
          className="inline-flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
        >
          <Plus className="w-5 h-5" />
          Add New Doctor
        </button>
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

      {/* Doctors Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="text-lg font-bold text-slate-900">Manage Doctors</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search doctors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full md:w-64"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <th className="px-6 py-4 font-semibold">Doctor Name</th>
                <th className="px-6 py-4 font-semibold">Specialization</th>
                <th className="px-6 py-4 font-semibold">Availability</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDoctors.map((doctor) => (
                <tr key={doctor.uid} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold text-xs">
                        {doctor.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{doctor.name}</p>
                        <p className="text-xs text-slate-500">{doctor.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-md text-xs font-medium">
                      {doctor.specialization}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-xs text-slate-600">{doctor.availability.days.join(', ')}</p>
                    <p className="text-[10px] text-slate-400">{doctor.availability.timeSlots.join(', ')}</p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => openEditModal(doctor)}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteDoctor(doctor.uid)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredDoctors.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-slate-500">
                    No doctors found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Appointments Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">All Appointments</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <th className="px-6 py-4 font-semibold">Patient</th>
                <th className="px-6 py-4 font-semibold">Doctor</th>
                <th className="px-6 py-4 font-semibold">Date & Time</th>
                <th className="px-6 py-4 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {appointments.slice(0, 10).map((appointment) => (
                <tr key={appointment.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-semibold text-slate-900">{appointment.patientName}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-slate-600">{appointment.doctorName}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-xs text-slate-600">{appointment.date}</p>
                    <p className="text-[10px] text-slate-400">{appointment.time}</p>
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={appointment.status as any} />
                  </td>
                </tr>
              ))}
              {appointments.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-slate-500">
                    No appointments found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl relative z-10 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900">
                {editingDoctor ? 'Edit Doctor Profile' : 'Add New Doctor'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleAddDoctor} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-slate-700">Full Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="Dr. John Smith"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-slate-700">Email Address</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="john@clinic.com"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700">Specialization</label>
                <input
                  type="text"
                  required
                  value={formData.specialization}
                  onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="e.g. Cardiologist, Dermatologist"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Available Days</label>
                <div className="flex flex-wrap gap-2">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => {
                        const newDays = formData.days.includes(day)
                          ? formData.days.filter(d => d !== day)
                          : [...formData.days, day];
                        setFormData({ ...formData, days: newDays });
                      }}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                        formData.days.includes(day)
                          ? "bg-indigo-600 text-white border-indigo-600"
                          : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300"
                      )}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Time Slots</label>
                <div className="flex flex-wrap gap-2">
                  {['09:00 AM', '10:00 AM', '11:00 AM', '02:00 PM', '03:00 PM', '04:00 PM'].map(slot => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => {
                        const newSlots = formData.timeSlots.includes(slot)
                          ? formData.timeSlots.filter(s => s !== slot)
                          : [...formData.timeSlots, slot];
                        setFormData({ ...formData, timeSlots: newSlots });
                      }}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                        formData.timeSlots.includes(slot)
                          ? "bg-indigo-600 text-white border-indigo-600"
                          : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300"
                      )}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              </div>
              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl font-semibold hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                >
                  {editingDoctor ? 'Save Changes' : 'Add Doctor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
