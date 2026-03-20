import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, addDoc, orderBy, getDocs } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Calendar, 
  Clock, 
  Search, 
  Stethoscope, 
  User, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle,
  X,
  ChevronRight,
  Filter
} from 'lucide-react';
import StatusBadge from '../../components/StatusBadge';
import { format, addDays, isAfter, isBefore, startOfDay } from 'date-fns';
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
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  specialization: string;
  date: string;
  time: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  notes?: string;
}

export default function PatientDashboard() {
  const { profile } = useAuth();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [bookingDate, setBookingDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [bookingTime, setBookingTime] = useState('');
  const [isBooking, setIsBooking] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const doctorsQuery = query(collection(db, 'doctors'));
    const unsubDoctors = onSnapshot(doctorsQuery, (snapshot) => {
      setDoctors(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as Doctor)));
    });

    if (profile?.uid) {
      const appointmentsQuery = query(
        collection(db, 'appointments'),
        where('patientId', '==', profile.uid),
        orderBy('date', 'desc')
      );
      const unsubAppointments = onSnapshot(appointmentsQuery, (snapshot) => {
        setAppointments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment)));
        setLoading(false);
      });
      return () => {
        unsubDoctors();
        unsubAppointments();
      };
    }

    return () => unsubDoctors();
  }, [profile?.uid]);

  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctor || !profile) return;

    setIsBooking(true);
    try {
      await addDoc(collection(db, 'appointments'), {
        patientId: profile.uid,
        patientName: profile.name,
        doctorId: selectedDoctor.uid,
        doctorName: selectedDoctor.name,
        specialization: selectedDoctor.specialization,
        date: bookingDate,
        time: bookingTime,
        status: 'pending',
        createdAt: new Date().toISOString(),
      });

      setSuccessMessage('Appointment booked successfully! Waiting for doctor approval.');
      setSelectedDoctor(null);
      setBookingTime('');
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (error) {
      console.error("Error booking appointment:", error);
    } finally {
      setIsBooking(false);
    }
  };

  const filteredDoctors = doctors.filter(d => 
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    d.specialization.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const upcomingAppointments = appointments.filter(a => a.status !== 'completed' && a.status !== 'rejected');
  const pastAppointments = appointments.filter(a => a.status === 'completed' || a.status === 'rejected');

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Welcome, {profile?.name}</h1>
          <p className="text-slate-500">Book and manage your doctor appointments</p>
        </div>
      </div>

      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 px-6 py-4 rounded-2xl flex items-center gap-3 shadow-sm animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-6 h-6 flex-shrink-0" />
          <p className="font-medium">{successMessage}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Left Column: Find Doctors */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">Available Doctors</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name or specialization..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full md:w-64 shadow-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredDoctors.map((doctor) => (
              <div key={doctor.uid} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                    <Stethoscope className="w-8 h-8" />
                  </div>
                  <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-[10px] font-bold uppercase tracking-wider">
                    {doctor.specialization}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">{doctor.name}</h3>
                <p className="text-sm text-slate-500 mb-4 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  {doctor.availability.days.join(', ')}
                </p>
                <button
                  onClick={() => setSelectedDoctor(doctor)}
                  className="w-full py-2.5 bg-slate-50 text-indigo-600 font-bold rounded-xl hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-center gap-2 group-hover:bg-indigo-600 group-hover:text-white"
                >
                  Book Appointment
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ))}
            {filteredDoctors.length === 0 && (
              <div className="col-span-full p-12 bg-white rounded-2xl border border-dashed border-slate-300 text-center">
                <p className="text-slate-500 font-medium">No doctors found matching your search.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: My Appointments */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-slate-900">My Appointments</h2>
          
          <div className="space-y-4">
            {upcomingAppointments.length > 0 ? (
              upcomingAppointments.map((appointment) => (
                <div key={appointment.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <StatusBadge status={appointment.status} />
                    <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                      {format(new Date(appointment.date), 'MMM dd')} @ {appointment.time}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-slate-500">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">{appointment.doctorName}</p>
                      <p className="text-xs text-slate-500">{appointment.specialization}</p>
                    </div>
                  </div>
                  {appointment.notes && (
                    <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                      <p className="text-[10px] font-bold text-indigo-600 uppercase mb-1">Doctor's Notes</p>
                      <p className="text-xs text-indigo-700 italic">"{appointment.notes}"</p>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="bg-white p-8 rounded-2xl border border-dashed border-slate-200 text-center">
                <p className="text-sm text-slate-400">No upcoming appointments</p>
              </div>
            )}
          </div>

          {pastAppointments.length > 0 && (
            <div className="pt-6">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Past History</h3>
              <div className="space-y-3">
                {pastAppointments.slice(0, 3).map((appointment) => (
                  <div key={appointment.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl opacity-70">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-slate-400">
                        <User className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-700">{appointment.doctorName}</p>
                        <p className="text-[10px] text-slate-500">{format(new Date(appointment.date), 'MMM dd, yyyy')}</p>
                      </div>
                    </div>
                    <StatusBadge status={appointment.status} className="text-[10px] px-2 py-0.5" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Booking Modal */}
      {selectedDoctor && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectedDoctor(null)} />
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative z-10 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Book Appointment</h3>
                <p className="text-sm text-slate-500">With {selectedDoctor.name}</p>
              </div>
              <button onClick={() => setSelectedDoctor(null)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleBookAppointment} className="p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Select Date</label>
                <input
                  type="date"
                  required
                  min={format(new Date(), 'yyyy-MM-dd')}
                  value={bookingDate}
                  onChange={(e) => setBookingDate(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Available Time Slots</label>
                <div className="grid grid-cols-3 gap-2">
                  {selectedDoctor.availability.timeSlots.map(slot => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setBookingTime(slot)}
                      className={cn(
                        "px-3 py-2 rounded-lg text-xs font-bold border transition-all",
                        bookingTime === slot
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100"
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
                  onClick={() => setSelectedDoctor(null)}
                  className="flex-1 px-4 py-3 border border-slate-200 text-slate-600 rounded-xl font-semibold hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isBooking || !bookingTime}
                  className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isBooking ? 'Booking...' : 'Confirm Booking'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
