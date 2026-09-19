package com.neshastyar.app.navigation

import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.neshastyar.app.ui.components.BottomTab
import com.neshastyar.app.ui.components.NeshastyarBottomBar
import com.neshastyar.app.ui.theme.NeshastyarColors
import com.neshastyar.app.ui.screens.account.AccountScreen
import com.neshastyar.app.ui.screens.auth.ForgotPasswordScreen
import com.neshastyar.app.ui.screens.auth.LoginScreen
import com.neshastyar.app.ui.screens.auth.SignUpScreen
import com.neshastyar.app.ui.screens.home.HomeScreen
import com.neshastyar.app.ui.screens.meeting.MeetingDetailScreen
import com.neshastyar.app.ui.screens.meeting.MeetingOptionsScreen
import com.neshastyar.app.ui.screens.participants.ParticipantDetailScreen
import com.neshastyar.app.ui.screens.participants.ParticipantsListScreen
import com.neshastyar.app.ui.screens.participants.ParticipantsManageScreen
import com.neshastyar.app.ui.screens.record.RecordScreen
import com.neshastyar.app.ui.screens.splash.SplashScreen
import com.neshastyar.app.ui.screens.tags.TagDetailScreen
import com.neshastyar.app.ui.screens.tags.TagListScreen
import com.neshastyar.app.ui.screens.tags.TagManageScreen
import com.neshastyar.app.ui.screens.tags.TagSelectionScreen

@Composable
fun NeshastyarNavHost() {
    val navController = rememberNavController()
    val backStack by navController.currentBackStackEntryAsState()
    val route = backStack?.destination?.route

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
    fun tabNavigate(tab: BottomTab) {
        navController.navigate(tab.route) {
            popUpTo(navController.graph.findStartDestination().id) { saveState = true }
            launchSingleTop = true
            restoreState = true
        }
    }

    val showBottomBar = route in setOf(
        Routes.Home.route, Routes.Tags.route, Routes.Participants.route, Routes.Account.route,
    )

    Scaffold(
        containerColor = NeshastyarColors.Background,
        bottomBar = {
            if (showBottomBar) {
                NeshastyarBottomBar(currentRoute = route, onTab = ::tabNavigate)
            }
        },
    ) { padding ->
        NavHost(
            navController = navController,
            startDestination = Routes.Splash.route,
            modifier = Modifier.padding(padding),
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
            composable(Routes.Home.route) {
                HomeScreen(
                    onLoggedOut = { goLoginClear() },
                    onOpenMeeting = { navController.navigate(Routes.MeetingDetail.create(it)) },
                    onRecord = { navController.navigate(Routes.Record.route) },
                )
            }
            composable(Routes.Tags.route) {
                TagListScreen(
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
                AccountScreen(onLoggedOut = { goLoginClear() })
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
            ) {
                MeetingDetailScreen(
                    onBack = { navController.popBackStack() },
                    onDeleted = {
                        navController.navigate(Routes.Home.route) {
                            popUpTo(Routes.Home.route) { inclusive = true }
                        }
                    },
                    onOptions = { id -> navController.navigate(Routes.MeetingOptions.create(id)) },
                )
            }
            composable(
                Routes.MeetingOptions.route,
                arguments = listOf(navArgument("meetingId") { type = NavType.StringType }),
            ) {
                MeetingOptionsScreen(onBack = { navController.popBackStack() })
            }
        }
    }
}