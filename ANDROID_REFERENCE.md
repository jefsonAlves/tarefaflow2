# SmartPlan Pro: Android Architecture Reference

Este documento contém a arquitetura e o código Kotlin/Compose para garantir a confiabilidade total dos alarmes e notificações no Android, conforme solicitado.

## 1. Reliable Alarm Manager (Kotlin)

Para garantir que o alarme toque mesmo em modo Doze ou com bateria otimizada.

```kotlin
// AlarmReceiver.kt
class AlarmReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val taskId = intent.getStringExtra("TASK_ID")
        // Exibir notificação de alta prioridade
        NotificationHelper.showTaskNotification(context, taskId)
        
        // Se for um lembrete "nagging", agendar o próximo para daqui a 2 minutos
        if (intent.getBooleanExtra("IS_NAGGING", false)) {
            AlarmScheduler.scheduleNextNagging(context, taskId)
        }
    }
}

// AlarmScheduler.kt
object AlarmScheduler {
    fun scheduleExactAlarm(context: Context, task: Task) {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val intent = Intent(context, AlarmReceiver::class.java).apply {
            putExtra("TASK_ID", task.id)
        }
        val pendingIntent = PendingIntent.getBroadcast(
            context, task.id.hashCode(), intent, 
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        // Usar setExactAndAllowWhileIdle para furar o modo Doze
        alarmManager.setExactAndAllowWhileIdle(
            AlarmManager.RTC_WAKEUP,
            task.dueDate.toEpochMilli(),
            pendingIntent
        )
    }
}
```

## 2. Boot Recovery

Garante que os alarmes sejam reprogramados após o reinício do aparelho.

```kotlin
// BootReceiver.kt
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED) {
            // Iniciar WorkManager para reprogramar todos os alarmes do banco Room
            val workRequest = OneTimeWorkRequestBuilder<RescheduleWorker>().build()
            WorkManager.getInstance(context).enqueue(workRequest)
        }
    }
}
```

## 3. Google Tasks Sync Logic (Safe Sync)

Evita que a sincronização apague dados locais.

```kotlin
// SyncRepository.kt
class SyncRepository(private val localDao: TaskDao, private val api: GoogleTasksApi) {
    suspend fun sync() {
        val remoteTasks = api.getTasks()
        val localTasks = localDao.getAllTasks()

        remoteTasks.forEach { remote ->
            val local = localTasks.find { it.externalId == remote.id }
            if (local != null) {
                // Lógica de Conflito: Priorizar horário local se existir
                val merged = local.copy(
                    title = remote.title,
                    // Nunca substituir alarme local por "null" da nuvem
                    dueDate = local.dueDate ?: remote.due
                )
                localDao.update(merged)
            } else {
                localDao.insert(remote.toLocalTask())
            }
        }
    }
}
```
