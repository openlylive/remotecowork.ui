import cookie from 'js-cookie'

export default function createPlugin () {
  return store => {
    store.subscribe((mutation, state) => {
      if (mutation.type === 'setUserName' || mutation.type === 'setUserKeys') cookie.set('user', state.user.user)
      else if (['setTeamName', 'setTeamSettings', 'setSymKey', 'setTeamAdmin'].includes(mutation.type)) {
        cookie.set('teamsettings', state.team.teamSettings)
      } else if (['addTeamMembers', 'deleteTeamMembers', 'updateTeamMember', 'updateTeamMemberLocation', 'disconnectedTeamMembers', 'connectedTeamMembers', 'setTeamMembers', 'clearHistory'].includes(mutation.type)) {
        window.localStorage.setItem('teammembers', JSON.stringify(state.team.teamMembers))
      }
    })
  }
}
