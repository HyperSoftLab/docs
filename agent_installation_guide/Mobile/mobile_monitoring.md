# Требования к Совместимости Мобильного агента для iOS

- **Операционная система:** iOS 10 или выше.
- **API/SDK:** Поддержка NSURLConnection и AFNetworking, ограниченная поддержка NSURLSession.
- **Языки программирования:** Objective-C и Swift.
- **Устройства:** Совместимость с iOS-устройствами.
- **Размер файла:** Добавляет 2-12 МБ к приложению.
- **Архитектура:** ARM 64-бит.
- **SHA-2:** Требуется поддержка SHA-2 (256-бит) на сервере приложения.
- **Xcode:** Рекомендуется использовать последнюю версию.
- **CocoaPods:** Версия 1.10.1 или выше.
- **tvOS:** Поддержка приложений tvOS.

Полный список и подробности доступны в [официальной документации](https://docs.newrelic.com/docs/mobile-monitoring/new-relic-mobile-ios/get-started/new-relic-ios-compatibility-requirements/) 

# Требования к Совместимости Мобильного агента для Android

- **Операционная система:** Android 7.0 или выше.
- **API/SDK:** Поддержка HttpURLConnection, OkHttp2 (кроме версий 2.0 и 2.4), OkHttp (версии 2.8, 3.5+, 4.0+), OkIO (версия 1.11), AndroidHttpClient, Volley (версия 1.0.0) и Apache HTTP Client.
- **Языки программирования:** Java 1.7 до Java 9, JDK 11 поддерживается в версии 6.2.0 и выше, JDK 17 - в версии 7.0.0 и выше.
- **Устройства:** Любые совместимые с Android устройства (смартфоны, планшеты, Android TV, Amazon Fire и т.д.).
- **Размер файла:** Агент добавляет менее 500 КБ к вашему релизному APK.
- **Архитектура:** ARM, Intel Atom.
- **Поддержка Gradle и Android Studio:** Требуется соответствующая версия Gradle и Android Studio в зависимости от версии агента.
Полный список и подробности доступны в [официальной документации](https://docs.newrelic.com/docs/mobile-monitoring/new-relic-mobile-android/get-started/new-relic-android-compatibility-requirements/) 


# Безопасность мобильных приложений

В целях обеспечения прозрачности и безопасности, наш продукт руководствуется следующими основными принципами::
- **Сбор данных**: Ограничивается информацией о производительности, исключая личные данные пользователя.
- **Безопасные конечные точки**: Данные отправляются на защищенные серверы.
- **Уникальные идентификаторы**: Используются для отслеживания установок и сессий.
- **Отсутствие удаленных обновлений**: Агент не обновляется удаленно без ведома пользователя.
- **Хранение данных**: Информация хранится в памяти устройства.
- **Инструментарий кода**: Внедряемый код не влияет на безопасность.
- **IP-адрес пользователя**: Используется для обогащения данных, но не сохраняется.

Дополнительное описание аспектов безопасности мобильного SDK доступны в [официальной документации](https://docs.newrelic.com/docs/mobile-monitoring/new-relic-mobile/get-started/security-mobile-apps/)


# Установка мобильного агента для IOS

## 1. Установка сборки

В зависимости от того какой менеджер пакета вы используете для описания сборки - выберете пункт 1.1,1.2 или  1.3 соответственно
### 1.1 CocoaPods
*Обновление podspec*

1. Добавьте следующую строку в ваш `Podfile`:
```ruby
pod 'NewRelicAgent'
```
2. Закройте ваш проект в Xcode и выполните обновление, запустив следующую команду из терминала в директории вашего проекта:
```bash
pod install
```
3. Откройте ваш проект в Xcode, запустив следующую команду из терминала в директории вашего проекта:
```bash
open App.xcworkspace
```
### 1.2 Xcode

*Загрузка и Распаковка XCFramework SDK*

1. Перейдите на [страницу с заметками](https://docs.newrelic.com/docs/release-notes/mobile-release-notes/ios-release-notes/) о выпуске iOS агента, чтобы скачать последнюю версию.
2. Загрузите SDK и сохраните файл на ваш компьютер.

*Добавление XCFramework в Ваш Проект Xcode*

1. Распакуйте скачанный SDK.
2. Откройте Finder и найдите папку `NewRelicAgent.xcframework`, которую вы только что распаковали.
3. Перетащите папку `NewRelicAgent.xcframework` из Finder в ваш проект Xcode, поместив её в панель Frameworks целевого проекта.
4. В разделе Embed выберите опцию "Embed & Sign".

Примечание: Убедитесь, что вы используете последнюю версию Xcode и ваш проект настроен для работы с XCFramework.

### 1.3 Swift Packages Manage
*Добавление Package.manifest*

1. Для добавления зависимости через Swift Package Manager выполните следующие шаги:
2. В Xcode перейдите в меню `File` > `Swift Packages` > `Add Package Dependency`.
3. Введите URL репозитория пакета на GitHub:
```shell
https://github.com/newrelic/newrelic-ios-agent-spm
```

## 2. Конфигурация SDK

### 2.1 Конфигурация на Objective - c
*Обновление файла `AppDelegate.m`*

Для интеграции агента необходимо внести изменения в файл `AppDelegate.m` вашего мобильного приложения.

1. В начале файла `AppDelegate.m` добавьте следующий код для импорта необходимой библиотеки:
```objc
#import <NewRelic/NewRelic.h>
```
2. В файле `AppDelegate.m` добавьте этот вызов как первую строку метода `application:didFinishLaunchingWithOptions:`:
```objc
[NewRelic startWithApplicationToken:@"<your_token>"
                andCollectorAddress:@"<your_collector_adress>"
           andCrashCollectorAddress:@"<your_collector_adress>"];
```
### 2.2 Конфигурация на Swift
*Обновление файла `AppDelegate.swift`*

Для интеграции агента необходимо внести изменения в файл `AppDelegate.swift` вашего мобильного приложения.
1. В начале файла `AppDelegate.swift` добавьте следующий код для импорта необходимой библиотеки:
```swift
import NewRelic/NewRelic
```
2. В файле `AppDelegate.swift` добавьте этот вызов как первую строку метода `application:didFinishLaunchingWithOptions`:
```swift
NewRelic.start(
    withApplicationToken: "<your_token>",
    andCollectorAddress: "<your_collector_adress>",
    andCrashCollectorAddress: "<your_collector_adress>"
)
```

### 3. Автоматическая загрузка вашего файла dSYM
1. В навигаторе XCode выберите ваш проект, затем кликните на целевое приложение (application target).
2. Выберите вкладку "Build Phases" и добавьте новую фазу сборки скриптов ("New Run Script Build Phase").
3. В текстовом поле скрипта (под строкой Shell) введите следующий скрипт:

```bash
#import <NewRelic/NewRelic.h>

SCRIPT=`/usr/bin/find "${SRCROOT}" -name newrelic_postbuild.sh | head -n 1`
if [ -z "${SCRIPT}"]; then
ARTIFACT_DIR="${BUILD_DIR%Build/*}SourcePackages/artifacts"
SCRIPT=`/usr/bin/find "${ARTIFACT_DIR}" -name newrelic_postbuild.sh | head -n 1`
fi
/bin/sh "${SCRIPT}" "<your_tokken>-NRMA"
```

### 4. Сборка и запуск вашего приложения

Для начала работы с данными, выполните следующие шаги:
1. Очистите ваш проект
2. Запустите ваше приложение в эмуляторе или на устройстве, чтобы начать видеть данные.

### 5. Начало работы

После установки агента в ваше приложение, в течение нескольких минут вы должны увидеть данные в вашем аккаунте GMonit.

#### Если данные не появляются:
- Если вы не видите данные о приложении после нескольких минут, подождите немного.

- В случае возникновения проблем с установкой или отсутствия данных, обратитесь за помощью к документации:
  [iOS документация](https://docs.newrelic.com/docs/mobile-monitoring/new-relic-mobile-ios/get-started/introduction-new-relic-mobile-ios/)


# Установка мобильного агента для Android

- Установите последнюю версию [SDK](https://developer.android.com/tools/releases/platform-tools)

- Для ознакомления с подробностями, пожалуйста, просмотрите примечания к релизу:
   [Примечания к релизу Android](https://docs.newrelic.com/docs/release-notes/mobile-release-notes/android-release-notes/)

- SDK New Relic требует Android версии 4.0 и выше. Если ваше приложение поддерживает версии Android ниже 5.0, имеется дополнительная информация о поддержке Multi-Dex:
   [Инструкция по установке агента Android через Gradle](https://docs.newrelic.com/docs/mobile-monitoring/new-relic-mobile-android/install-configure/install-android-agent-gradle/)

## 1. Установка SDK через gradle
В зависимости от того какой язык вы используете (groovy или kotlin) для описания сборки - выберете пункт 1.1 или 1.2 соответственно
### 1.1 Groovy
*Обновление файла `build.gradle`*

1. Следующие изменения необходимо внести в файл `build.gradle` на уровне вашего проекта до применения плагинов:

```groovy
buildscript {

  // Данная секция необходима только, если pluginManagement не используется в settings.gradle 
  repositories {
    mavenCentral()
  }

  dependencies {
    classpath 'com.newrelic.agent.android:agent-gradle-plugin:7.2.0'
  }
}
```

2. Добавьте или дополните следующие строки в файл build.gradle вашего модуля:

```groovy
plugins {
  id 'newrelic'
}

dependencies {
  implementation 'com.newrelic.agent.android:android-agent:7.2.0'
}
```

### 1.2 Kotlin
*Обновление файла `build.gradle.kts`*

1. Добавьте или дополните следующие строки в файл `build.gradle.kts` на уровне вашего проекта перед применением плагинов:

```kotlin
buildscript {
  // Данная секция необходима только, если pluginManagement не используется в settings.gradle 
  repositories {
    mavenCentral()
  }
  dependencies {
    classpath("com.newrelic.agent.android:agent-gradle-plugin:7.2.0")
  }
}
```

2. Добавьте или дополните следующие строки в файл build.gradle.kts вашего модуля:

```kotlin
plugins {
  id("newrelic")
}

dependencies {
  implementation("com.newrelic.agent.android:android-agent:7.2.0")
}
```

## 2. Настройка разрешений приложения

Убедитесь, что ваше приложение запрашивает разрешения `INTERNET` и `ACCESS_NETWORK_STATE`, добавив следующие строки в файл `AndroidManifest.xml` вашего Android проекта:

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
```

## 3. Конфигурация SDK

### 3.1 Конфигурация на Java

1. Импортируйте класс NewRelic в ваш основной Activity :

```java
import com.newrelic.agent.android.NewRelic;
```

2. Для инициализации New Relic добавьте следующий фрагмент кода в метод `onCreate()`

```java
NewRelic.withApplicationToken(
    "<your_token>-NRMA"
)
.usingCollectorAddress("<your_collector_adress>")
.usingCrashCollectorAddress("<your_collector_adress>")
.start(this.getApplicationContext());
```

### 3.2 Конфигурация на Kotlin

1. Импортируйте класс NewRelic в ваш основной Activity :

```kotlin
import com.newrelic.agent.android.NewRelic;
```

2. Для инициализации New Relic добавьте следующий фрагмент кода в метод `onCreate()`

```kotlin
NewRelic.withApplicationToken("<your_token>")
.usingCollectorAddress("<your_collector_adress>")
.usingCrashCollectorAddress("<your_collector_adress>")
.start(this.applicationContext);
```

## 4. Сборка и запуск вашего приложения
Для начала работы с данными, выполните следующие шаги:

1. Очистите ваш проект
2. Запустите ваше приложение в эмуляторе или на устройстве, чтобы начать видеть данные.

## 5. Начало работы
После установки агента в ваше приложение, в течение нескольких минут вы должны увидеть данные в вашем аккаунте GMonit.

### Если данные не появляются:
- Если вы не видите данные о приложении после нескольких минут, подождите немного.
- В случае возникновения проблем с установкой или отсутствия данных, обратитесь за помощью к документации:
  [Android документация](https://docs.newrelic.com/docs/mobile-monitoring/new-relic-mobile-android/get-started/introduction-new-relic-mobile-android/)

