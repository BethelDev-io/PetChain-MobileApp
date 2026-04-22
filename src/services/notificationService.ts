import * as Notifications from 'expo-notifications';

// Types
interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: number; // hours between doses
  startDate: Date;
}

interface Appointment {
  id: string;
  title: string;
  date: Date;
  location?: string;
}

interface Vaccination {
  id: string;
  name: string;
  dueDate: Date;
  petId: string;
}

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const requestPermissions = async (): Promise<boolean> => {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
};

export const scheduleMedicationReminder = async (medication: Medication): Promise<string> => {
  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Medication Reminder',
      body: `Time to give ${medication.name} (${medication.dosage})`,
      data: { type: 'medication', medicationId: medication.id },
    },
    trigger: {
      type: 'calendar',
      hour: new Date(medication.startDate).getHours(),
      minute: new Date(medication.startDate).getMinutes(),
      repeats: true,
    } as Notifications.CalendarTriggerInput,
  });
  return notificationId;
};

export const scheduleAppointmentNotification = async (appointment: Appointment): Promise<string> => {
  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Appointment Reminder',
      body: `${appointment.title}${appointment.location ? ` at ${appointment.location}` : ''}`,
      data: { type: 'appointment', appointmentId: appointment.id },
    },
    trigger: {
      type: 'date',
      date: new Date(appointment.date.getTime() - 60 * 60 * 1000), // 1 hour before
    } as Notifications.DateTriggerInput,
  });
  return notificationId;
};

export const scheduleVaccinationReminder = async (vaccination: Vaccination): Promise<string> => {
  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Vaccination Due',
      body: `${vaccination.name} vaccination is due for your pet`,
      data: { type: 'vaccination', vaccinationId: vaccination.id, petId: vaccination.petId },
    },
    trigger: {
      type: 'date',
      date: vaccination.dueDate,
    } as Notifications.DateTriggerInput,
  });
  return notificationId;
};

export const cancelNotification = async (notificationId: string): Promise<void> => {
  await Notifications.cancelScheduledNotificationAsync(notificationId);
};

export const cancelAllNotifications = async (): Promise<void> => {
  await Notifications.cancelAllScheduledNotificationsAsync();
};