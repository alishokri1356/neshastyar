package com.neshastyar.app.navigation

import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import com.neshastyar.app.data.local.DraftStatus
import com.neshastyar.app.ui.components.LocalGoHome
import com.neshastyar.app.ui.components.NeshastyarTopBar
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.neshastyar.app.ui.components.NeshastyarBottomBar
import com.neshastyar.app.ui.theme.NeshastyarColors
import com.neshastyar.app.ui.screens.account.AccountScreen
import com.neshastyar.app.ui.screens.auth.ForgotPasswordScreen
import com.neshastyar.app.ui.screens.auth.LoginScreen
import com.neshastyar.app.ui.screens.auth.ResetPasswordScreen
import com.neshastyar.app.ui.screens.auth.SignUpScreen
import com.neshastyar.app.ui.screens.auth.VerifyEmailScreen
import com.neshastyar.app.ui.screens.chat.ChatHistoryScreen
import com.neshastyar.app.ui.screens.chat.ChatScreen
import com.neshastyar.app.ui.screens.home.HomeScreen
import com.neshastyar.app.ui.screens.home.MeetingsByDateScreen
import com.neshastyar.app.ui.screens.search.SearchScreen
import com.neshastyar.app.ui.screens.meeting.MeetingAddParticipantsScreen
import com.neshastyar.app.ui.screens.meeting.MeetingAddTagsScreen
import com.neshastyar.app.ui.screens.meeting.MeetingBottomTab
import com.neshastyar.app.ui.screens.meeting.MeetingBulletPointsScreen
import com.neshastyar.app.ui.screens.meeting.MeetingConversationScreen
import com.neshastyar.app.ui.screens.meeting.MeetingDetailBottomBar
import com.neshastyar.app.ui.screens.meeting.MeetingDetailScreen
import com.neshastyar.app.ui.screens.meeting.MeetingDetailViewModel
import com.neshastyar.app.util.StatusStyle
import com.neshastyar.app.ui.screens.meeting.MeetingOptionsScreen
import com.neshastyar.app.ui.screens.meeting.MeetingParticipantsScreen
import com.neshastyar.app.ui.screens.meeting.MeetingTagsScreen
import com.neshastyar.app.ui.screens.participants.ParticipantDetailScreen
import com.neshastyar.app.ui.screens.participants.ParticipantsListScreen
import com.neshastyar.app.ui.screens.participants.ParticipantsManageScreen
import com.neshastyar.app.ui.screens.record.RecordScreen
import com.neshastyar.app.ui.screens.report.MeetingReportScreen
import com.neshastyar.app.ui.screens.splash.SplashScreen
import com.neshastyar.app.ui.screens.tags.TagDetailScreen
import com.neshastyar.app.ui.screens.tags.TagListScreen
import com.neshastyar.app.ui.screens.tags.TagManageScreen
import com.neshastyar.app.ui.screens.tags.TagSelectionScreen
import com.neshastyar.app.ui.update.AppUpdateDialog
import com.neshastyar.app.ui.update.AppUpdateViewModel

@Composable
fun NeshastyarNavHost(
    pendingLink: AppLink? = null,
    onLinkConsumed: () -> Unit = {},
    updateViewModel: AppUpdateViewModel = hiltViewModel(),
) {
    val navController = rememberNavController()
    val backStack by navController.currentBackStackEntryAsState()
    val route = backStack?.destination?.route
    val appUpdate by updateViewModel.update.collectAsStateWithLifecycle()

    LaunchedEffect(Unit) {
        updateViewModel.check()
    }

    fun goLoginClear() {
        navController.navigate(Routes.Login.route) {
            popUpTo(0) { inclusive = true }
            launchSingleTop = true
        }
    }
    fun goHomeClear() {
        navController.navigate(Routes.Home.route) {
            popUpTo(0) { inclusive = true }
            launchSingleTop = true
        }
    }
    fun openSearch() {
        navController.navigate(Routes.Search.route) {
            launchSingleTop = true
        }
    }

    val meetingSectionRoutes = setOf(
        Routes.MeetingDetail.route,
        Routes.MeetingParticipants.route,
        Routes.MeetingAddParticipants.route,
        Routes.MeetingTags.route,
        Routes.MeetingAddTags.route,
        Routes.MeetingBulletPoints.route,
        Routes.MeetingOptions.route,
        Routes.MeetingConversation.route,
    )
    val meetingId = backStack?.arguments?.getString("meetingId")
    val showMeetingBar = route in meetingSectionRoutes && !meetingId.isNullOrBlank()
    fun openMeetingSection(destination: String, targetRoute: String? = null) {
        if (targetRoute != null && route == targetRoute) return
        val id = meetingId ?: return
        navController.navigate(destination) {
            popUpTo(Routes.MeetingDetail.route) { inclusive = false }
            launchSingleTop = true
        }
    }
    fun openMeetingSummary(id: String) {
        if (route == Routes.MeetingDetail.route) return
        if (!navController.popBackStack(Routes.MeetingDetail.route, inclusive = false)) {
            navController.navigate(Routes.MeetingDetail.create(id)) {
                launchSingleTop = true
            }
        }
    }

    val showChrome = route != null && route !in setOf(
        Routes.Splash.route,
        Routes.Login.route,
        Routes.SignUp.route,
        Routes.ForgotPassword.route,
        Routes.VerifyEmail.route,
        Routes.ResetPassword.route,
        Routes.MeetingReport.route,
        Routes.Home.route,
        Routes.Chat.route,
        Routes.ChatHistory.route,
    )

    LaunchedEffect(pendingLink, route) {
        val link = pendingLink ?: return@LaunchedEffect
        if (route == null || route == Routes.Splash.route) return@LaunchedEffect
        onLinkConsumed()
        val destination = when (link) {
            is AppLink.VerifyEmail -> Routes.VerifyEmail.create(link.token)
            is AppLink.ResetPassword -> Routes.ResetPassword.create(link.token)
            is AppLink.Report -> Routes.MeetingReport.create(link.token)
        }
        navController.navigate(destination) { launchSingleTop = true }
    }
    val showBottomBar = route == Routes.Search.route
    fun openChat(meetingId: String? = null, sessionId: String? = null) {
        navController.navigate(Routes.Chat.create(meetingId = meetingId, sessionId = sessionId)) {
            // Replace any existing chat screen so session args create a fresh ViewModel.
            popUpTo(Routes.Chat.route) { inclusive = true }
            launchSingleTop = true
        }
    }

    CompositionLocalProvider(LocalGoHome provides { goHomeClear() }) {
    Scaffold(
        containerColor = NeshastyarColors.Background,
        topBar = {
            if (showChrome) {
                NeshastyarTopBar(onSearch = ::openSearch)
            }
        },
        bottomBar = {
            if (showBottomBar) {
                NeshastyarBottomBar(onSettings = { navController.navigate(Routes.Account.route) })
            } else if (showMeetingBar) {
                val id = meetingId.orEmpty()
                val detailEntry = remember(backStack) {
                    runCatching { navController.getBackStackEntry(Routes.MeetingDetail.route) }.getOrNull()
                }
                val detailVm: MeetingDetailViewModel? = detailEntry?.let { hiltViewModel(it) }
                val detailState = detailVm?.ui?.collectAsStateWithLifecycle()?.value
                val showProcessedSections = !StatusStyle.isErrorStatus(detailState?.meeting?.status) &&
                    detailState?.summarySuppressed != true
                val selectedTab = when (route) {
                    Routes.MeetingDetail.route -> MeetingBottomTab.Summary
                    Routes.MeetingBulletPoints.route -> MeetingBottomTab.BulletPoints
                    Routes.MeetingOptions.route,
                    Routes.MeetingConversation.route -> MeetingBottomTab.Options
                    else -> null
                }
                MeetingDetailBottomBar(
                    onSummary = { openMeetingSummary(id) },
                    onBulletPoints = {
                        openMeetingSection(
                            Routes.MeetingBulletPoints.create(id),
                            Routes.MeetingBulletPoints.route,
                        )
                    },
                    onAiEdit = {
                        openMeetingSummary(id)
                        detailVm?.openAiEditSheet()
                    },
                    onMenu = {
                        openMeetingSection(
                            Routes.MeetingOptions.create(id),
                            Routes.MeetingOptions.route,
                        )
                    },
                    selectedTab = selectedTab,
                    showProcessedSections = showProcessedSections,
                )
            }
        },
    ) { padding ->
        NavHost(
            navController = navController,
            startDestination = Routes.Splash.route,
            modifier = if (route == Routes.Login.route ||
                route == Routes.Chat.route ||
                route == Routes.ChatHistory.route
            ) {
                Modifier
            } else {
                Modifier.padding(padding)
            },
        ) {
            composable(Routes.Splash.route) {
                SplashScreen(onGoHome = { goHomeClear() }, onGoLogin = { goLoginClear() })
            }
            composable(Routes.Login.route) {
                LoginScreen(
                    onLoggedIn = { goHomeClear() },
                    onSignUp = { navController.navigate(Routes.SignUp.route) },
                    onForgotPassword = { navController.navigate(Routes.ForgotPassword.route) },
                )
            }
            composable(Routes.SignUp.route) {
                SignUpScreen(
                    onDone = {
                        navController.navigate(Routes.Login.route) {
                            popUpTo(Routes.SignUp.route) { inclusive = true }
                        }
                    },
                    onBackToLogin = { navController.popBackStack() },
                )
            }
            composable(Routes.ForgotPassword.route) {
                ForgotPasswordScreen(onBackToLogin = { navController.popBackStack() })
            }
            composable(
                Routes.VerifyEmail.route,
                arguments = listOf(navArgument("token") { type = NavType.StringType }),
            ) {
                VerifyEmailScreen(onGoLogin = { goLoginClear() })
            }
            composable(
                Routes.ResetPassword.route,
                arguments = listOf(navArgument("token") { type = NavType.StringType }),
            ) {
                ResetPasswordScreen(onGoLogin = { goLoginClear() })
            }
            composable(
                Routes.MeetingReport.route,
                arguments = listOf(navArgument("token") { type = NavType.StringType }),
            ) {
                MeetingReportScreen(onBack = {
                    if (!navController.popBackStack()) goHomeClear()
                })
            }
            composable(Routes.Home.route) {
                HomeScreen(
                    onRecord = {
                        navController.navigate(Routes.Record.route) {
                            launchSingleTop = true
                        }
                    },
                    onSearch = ::openSearch,
                    onAsk = { openChat() },
                    onAccount = { navController.navigate(Routes.Account.route) },
                    onOpenMeeting = { navController.navigate(Routes.MeetingDetail.create(it)) },
                    onOpenLocalDraft = { draftId, status ->
                        if (status == DraftStatus.ON_RECORDING) {
                            navController.navigate(Routes.Record.route)
                        } else {
                            navController.navigate(Routes.TagSelection.create(draftId))
                        }
                    },
                )
            }
            composable(
                route = Routes.Chat.route,
                arguments = listOf(
                    navArgument("sessionKey") { type = NavType.StringType },
                    navArgument("meetingId") {
                        type = NavType.StringType
                        nullable = true
                        defaultValue = ""
                    },
                ),
            ) {
                ChatScreen(
                    onBack = { navController.popBackStack() },
                    onOpenHistory = { meetingIdArg ->
                        navController.navigate(Routes.ChatHistory.create(meetingIdArg))
                    },
                )
            }
            composable(
                route = Routes.ChatHistory.route,
                arguments = listOf(
                    navArgument("meetingId") {
                        type = NavType.StringType
                        nullable = true
                        defaultValue = ""
                    },
                ),
            ) {
                ChatHistoryScreen(
                    onBack = { navController.popBackStack() },
                    onOpenSession = { sessionId, meetingIdArg ->
                        openChat(meetingId = meetingIdArg, sessionId = sessionId)
                    },
                )
            }
            composable(Routes.Search.route) {
                SearchScreen(
                    onOpenMeeting = { navController.navigate(Routes.MeetingDetail.create(it)) },
                )
            }
            composable(Routes.MeetingsByDate.route) {
                MeetingsByDateScreen(
                    onBack = { navController.popBackStack() },
                    onOpenMeeting = { navController.navigate(Routes.MeetingDetail.create(it)) },
                    onOpenLocalDraft = { draftId, status ->
                        if (status == DraftStatus.ON_RECORDING) {
                            navController.navigate(Routes.Record.route)
                        } else {
                            navController.navigate(Routes.TagSelection.create(draftId))
                        }
                    },
                )
            }
            composable(Routes.Tags.route) {
                TagListScreen(
                    onBack = { navController.popBackStack() },
                    onOpenTag = { navController.navigate(Routes.TagDetail.create(it)) },
                    onManage = { navController.navigate(Routes.TagManage.route) },
                )
            }
            composable(
                Routes.TagDetail.route,
                arguments = listOf(navArgument("tagId") { type = NavType.StringType }),
            ) {
                TagDetailScreen(
                    onBack = { navController.popBackStack() },
                    onOpenMeeting = { navController.navigate(Routes.MeetingDetail.create(it)) },
                )
            }
            composable(Routes.TagManage.route) {
                TagManageScreen(onBack = { navController.popBackStack() })
            }
            composable(Routes.Participants.route) {
                ParticipantsListScreen(
                    onBack = { navController.popBackStack() },
                    onOpen = { navController.navigate(Routes.ParticipantDetail.create(it)) },
                    onManage = { navController.navigate(Routes.ParticipantsManage.route) },
                )
            }
            composable(
                Routes.ParticipantDetail.route,
                arguments = listOf(navArgument("participantId") { type = NavType.StringType }),
            ) {
                ParticipantDetailScreen(
                    onBack = { navController.popBackStack() },
                    onOpenMeeting = { navController.navigate(Routes.MeetingDetail.create(it)) },
                )
            }
            composable(Routes.ParticipantsManage.route) {
                ParticipantsManageScreen(onBack = { navController.popBackStack() })
            }
            composable(Routes.Account.route) {
                AccountScreen(
                    onBack = { navController.popBackStack() },
                    onLoggedOut = { goLoginClear() },
                )
            }
            composable(Routes.Record.route) {
                RecordScreen(
                    onBack = { navController.popBackStack() },
                    onContinue = { draftId ->
                        navController.navigate(Routes.TagSelection.create(draftId))
                    },
                )
            }
            composable(
                Routes.TagSelection.route,
                arguments = listOf(navArgument("draftId") { type = NavType.StringType }),
            ) {
                TagSelectionScreen(
                    onBack = { navController.popBackStack() },
                    onUploaded = {
                        navController.navigate(Routes.Home.route) {
                            popUpTo(Routes.Home.route) { inclusive = false }
                            launchSingleTop = true
                        }
                    },
                )
            }
            composable(
                Routes.MeetingDetail.route,
                arguments = listOf(navArgument("meetingId") { type = NavType.StringType }),
            ) { entry ->
                val meetingIdArg = entry.arguments?.getString("meetingId").orEmpty()
                MeetingDetailScreen(
                    onBack = { navController.popBackStack() },
                    onParticipants = {
                        openMeetingSection(
                            Routes.MeetingParticipants.create(meetingIdArg),
                            Routes.MeetingParticipants.route,
                        )
                    },
                    onTags = {
                        openMeetingSection(
                            Routes.MeetingTags.create(meetingIdArg),
                            Routes.MeetingTags.route,
                        )
                    },
                )
            }
            composable(
                Routes.MeetingParticipants.route,
                arguments = listOf(navArgument("meetingId") { type = NavType.StringType }),
            ) { entry ->
                val meetingIdArg = entry.arguments?.getString("meetingId").orEmpty()
                MeetingParticipantsScreen(
                    onBack = { navController.popBackStack() },
                    onAddParticipants = { navController.navigate(Routes.MeetingAddParticipants.create(meetingIdArg)) },
                    onTags = {
                        openMeetingSection(
                            Routes.MeetingTags.create(meetingIdArg),
                            Routes.MeetingTags.route,
                        )
                    },
                )
            }
            composable(
                Routes.MeetingAddParticipants.route,
                arguments = listOf(navArgument("meetingId") { type = NavType.StringType }),
            ) {
                MeetingAddParticipantsScreen(onBack = { navController.popBackStack() })
            }
            composable(
                Routes.MeetingTags.route,
                arguments = listOf(navArgument("meetingId") { type = NavType.StringType }),
            ) { entry ->
                val meetingIdArg = entry.arguments?.getString("meetingId").orEmpty()
                MeetingTagsScreen(
                    onBack = { navController.popBackStack() },
                    onAddTags = { navController.navigate(Routes.MeetingAddTags.create(meetingIdArg)) },
                    onParticipants = {
                        openMeetingSection(
                            Routes.MeetingParticipants.create(meetingIdArg),
                            Routes.MeetingParticipants.route,
                        )
                    },
                )
            }
            composable(
                Routes.MeetingAddTags.route,
                arguments = listOf(navArgument("meetingId") { type = NavType.StringType }),
            ) {
                MeetingAddTagsScreen(onBack = { navController.popBackStack() })
            }
            composable(
                Routes.MeetingBulletPoints.route,
                arguments = listOf(navArgument("meetingId") { type = NavType.StringType }),
            ) { entry ->
                val meetingIdArg = entry.arguments?.getString("meetingId").orEmpty()
                MeetingBulletPointsScreen(
                    onBack = { navController.popBackStack() },
                    onParticipants = {
                        openMeetingSection(
                            Routes.MeetingParticipants.create(meetingIdArg),
                            Routes.MeetingParticipants.route,
                        )
                    },
                    onTags = {
                        openMeetingSection(
                            Routes.MeetingTags.create(meetingIdArg),
                            Routes.MeetingTags.route,
                        )
                    },
                )
            }
            composable(
                Routes.MeetingOptions.route,
                arguments = listOf(navArgument("meetingId") { type = NavType.StringType }),
            ) { entry ->
                val meetingIdArg = entry.arguments?.getString("meetingId").orEmpty()
                MeetingOptionsScreen(
                    onBack = { navController.popBackStack() },
                    onParticipants = {
                        openMeetingSection(
                            Routes.MeetingParticipants.create(meetingIdArg),
                            Routes.MeetingParticipants.route,
                        )
                    },
                    onTags = {
                        openMeetingSection(
                            Routes.MeetingTags.create(meetingIdArg),
                            Routes.MeetingTags.route,
                        )
                    },
                    onShowConversation = {
                        navController.navigate(Routes.MeetingConversation.create(meetingIdArg))
                    },
                    onDeleted = {
                        navController.navigate(Routes.Home.route) {
                            popUpTo(Routes.Home.route) { inclusive = true }
                        }
                    },
                )
            }
            composable(
                Routes.MeetingConversation.route,
                arguments = listOf(navArgument("meetingId") { type = NavType.StringType }),
            ) {
                MeetingConversationScreen(onBack = { navController.popBackStack() })
            }
        }
    }

    appUpdate?.let { update ->
        AppUpdateDialog(
            update = update,
            onDismiss = updateViewModel::dismiss,
        )
    }
    }
}