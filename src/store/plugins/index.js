export default function createPlugin () {
  return store => {
    store.subscribe((mutation, state) => {
      if (mutation.type === 'setUserName' || mutation.type === 'setUserKeys') {
        // cookie.set('user', state.user.user)
        const old = JSON.parse(window.localStorage.getItem('user'))
        const updated = state.user.user
        var newUser
        if (old) {
          newUser = Object.assign(old, updated)
        } else {
          newUser = updated
        }
        // console.log('Setting localstorage:', JSON.stringify(newUser))
        window.localStorage.setItem('user', JSON.stringify(newUser))
      } else if (['setTeamName', 'setTeamSettings', 'setSymKey', 'setTeamAdmin'].includes(mutation.type)) {
        // window.localStorage.setItem('teamsettings', JSON.stringify(state.team.currentTeam.teamSettings))
        console.log(state.team.teams)
        window.localStorage.setItem('teamsettings', JSON.stringify(state.team.teams))
      } else if (['addTeamMember', 'deleteTeamMembers', 'updateTeamMember', 'updateTeamMemberLocation', 'disconnectedTeamMembers', 'connectedTeamMembers', 'setTeamMembers'].includes(mutation.type)) {
        // window.localStorage.setItem('teammembers', JSON.stringify(state.team.currentTeam.teamMembers))
        window.localStorage.setItem('teamsettings', JSON.stringify(state.team.teams))
      }
    })
  }
}
