# Исправление утечки файловых дескрипторов (Too many open files)

## Контекст

Баг: после нескольких сеансов диктовки апплет перестаёт работать с ошибкой "Слишком много открытых файлов" (g-unix-error-quark). Красный квадрат на иконке, невозможность запустить новую запись. После ожидания (GC?) может временно заработать, но проблема возвращается.

Дополнительно: иногда перед ошибкой — долгое мигание "Отправка", затем watchdog timeout "Сервер долго не отвечал". Это отдельная проблема (медленный API), но она усугубляет утечку fd, т.к. за время ожидания процесс продолжает удерживать ресурсы.

## Корневая причина

`GLib.spawn_async_with_pipes()` возвращает 3 файловых дескриптора: `stdin_fd`, `stdout_fd`, `stderr_fd`.

**Утечка #1 — `stdin_fd` (критическая):**
Возвращается но НИГДЕ не закрывается. Утекает при каждом успешном вызове.

**Утечка #2 — `stdout_fd` и `stderr_fd` (критическая):**
Оборачиваются в `GLib.IOChannel.unix_new(fd)`. По умолчанию `close_on_unref=FALSE`, поэтому `shutdown(false)` НЕ закрывает underlying fd. `set_close_on_unref(true)` нигде не вызывается. Оба fd утекают.

**Итого: 3 fd утекают на каждый вызов `_spawnScript()` и `_runCommandAsync()`.**

При soft limit = 1024 и длительной сессии Cinnamon, лимит исчерпывается.

## Места утечки

### 1. `_spawnScript()` (строка 583) — каждая диктовка
- Файл: `applet/voice-keyboard@perlover/applet.js:583`
- stdin_fd (строка 583) — не закрывается
- stdout_fd, stderr_fd (строки 595, 598) — IOChannel без close_on_unref

### 2. `_runCommandAsync()` (строка 860) — export/import настроек
- Файл: `applet/voice-keyboard@perlover/applet.js:860`
- stdin_fd (строка 860) — не закрывается
- stdout_fd, stderr_fd (строки 866, 869) — IOChannel без close_on_unref

## Исправление

**Файл:** `applet/voice-keyboard@perlover/applet.js`

### Изменение 1: `_spawnScript()` — закрыть stdin_fd сразу после spawn

После строки 593 (`this._debug("Script spawned...")`):
```javascript
// stdin не используется — закрываем сразу
GLib.close(stdin_fd);
```

### Изменение 2: `_spawnScript()` — IOChannel должен закрывать fd

После создания каждого IOChannel (строки 595-596, 598-599) добавить:
```javascript
stdoutChannel.set_close_on_unref(true);
...
stderrChannel.set_close_on_unref(true);
```

Теперь `shutdown()` + GC закроют underlying fd.

### Изменение 3: `_runCommandAsync()` — аналогичные исправления

После строки 865 (`if (success) {`):
```javascript
GLib.close(stdin_fd);
```

После создания IOChannel (строки 866-867, 869-870):
```javascript
stdoutChannel.set_close_on_unref(true);
...
stderrChannel.set_close_on_unref(true);
```

## Проверка

1. Перезапустить Cinnamon (Ctrl+Alt+Esc)
2. Запомнить кол-во fd: `ls /proc/$(pgrep -f "cinnamon --replace" | head -1)/fd | wc -l`
3. Выполнить 10+ диктовок подряд
4. Проверить что кол-во fd не растёт
5. Убедиться что "Слишком много открытых файлов" больше не появляется
6. Проверить export/import настроек — тоже не должны утекать fd
