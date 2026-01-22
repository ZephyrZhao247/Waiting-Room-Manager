```
createBreakoutRooms
Desktop Client Version: 5.8.6

createBreakoutRooms(options: CreateBreakoutRoomsOptions): Promise<BreakoutRoomsResponse>
Deletes all existing breakout rooms and creates new ones. Response is same as getBreakoutRoomList.

Supported roles: Host, Co-Host

Supports Guest Mode: No

Error codes ZoomApiError

Status Code	Status Message
10122	Bo count and the name size do not match.
10095	The count is over the max count.
10096	The assignment type is incorrect.
10097	Create Breakout Room failed.
Parameters
options: CreateBreakoutRoomsOptions
Returns Promise<BreakoutRoomsResponse>
```
```
Type alias BreakoutRoomsResponse
BreakoutRoomsResponse: { rooms: { breakoutRoomId: string; name: string; participants?: ({ participantStatus: "assigned" | "joined" } & BreakOutRoomParticipant)[] }[]; state: "open" | "closed"; unassigned?: BreakOutRoomParticipant[] }
Type declaration
rooms: { breakoutRoomId: string; name: string; participants?: ({ participantStatus: "assigned" | "joined" } & BreakOutRoomParticipant)[] }[]
An array of breakout rooms with their names, UUID, and an array of participant ids. Owners get list of rooms and participants for each breakout room. Co-hosts and participants get only list of rooms.

state: "open" | "closed"
Whether the breakout rooms are active or not

Optional unassigned?: BreakOutRoomParticipant[]
Only meeting owners receive. An array of participants not in breakout rooms. Includes their displayNames and participantUUID.
```
```
@zoom/appssdk - v0.16.36ZoomSdkTypesCreateBreakoutRoomsOptions
Type alias CreateBreakoutRoomsOptions
CreateBreakoutRoomsOptions: { numberOfRooms: number; assign: BreakoutRoomAssignmentMethods; names?: string[] }
Type declaration
numberOfRooms: number
Amount of breakout rooms to create. Between 1 and 50. Optional if names is present

assign: BreakoutRoomAssignmentMethods
Method to assign participants to rooms. (automatically, manually, participantsChoose)

Optional names?: string[]
List of names to give breakout rooms upon creation. Between 1 and 50. If numberOfRooms is present, must match the length of this list. Added in client version 5.12.6
```
```
Type alias BreakoutRoomAssignmentMethods
BreakoutRoomAssignmentMethods: "automatically" | "manually" | "participantsChoose"
```
```
configureBreakoutRooms
Desktop Client Version: 5.8.6

configureBreakoutRooms(options: ConfigureBreakoutRoomsOptions): Promise<ConfigureBreakoutRoomsResponse>
Change breakout room settings.

Supported roles: Host, Co-Host

Supports Guest Mode: No

Note: Each parameter is optional. If the parameter is missing, the related setting is not changed.

Response is a JSON object with information about the current configuration.

Example

{
 "allowParticipantsChooseRoom": true,
 "allowParticipantsReturnToMainSession": true,
 "automaticallyMoveParticipantsIntoRooms": true,
 "closeAfter": 1,
 "countDown": 60
 "automaticallyMoveParticipantsIntoMainRoom": false
}
Error codes ZoomApiError

Status Code	Status Message
10099	Config Breakout Room failed.
Parameters
options: ConfigureBreakoutRoomsOptions
Returns Promise<ConfigureBreakoutRoomsResponse>
```
```
openBreakoutRooms
Desktop Client Version: 5.8.6

openBreakoutRooms(): Promise<GeneralMessageResponse>
Open breakout rooms.

Supported roles: Host, Co-Host

Supports Guest Mode: No

Error codes ZoomApiError

Status Code	Status Message
10121	Breakout Rooms are already open.
10100	Start Breakout Rooms failed.
Returns Promise<GeneralMessageResponse>
```
```
closeBreakoutRooms
Desktop Client Version: 5.8.6

iOS Client Version: 5.10.6

Android Client Version: 5.14.5

closeBreakoutRooms(): Promise<GeneralMessageResponse>
Close breakout rooms.

Supported roles: Host, Co-Host

Supports Guest Mode: No

Error codes ZoomApiError

Status Code	Status Message
10092	Breakout Rooms are not open.
10101	End Breakout Rooms failed.
Returns Promise<GeneralMessageResponse>
```
```
assignParticipantToBreakoutRoom
Desktop Client Version: 5.9.0

assignParticipantToBreakoutRoom(options: AssignParticipantToBreakoutRoomOptions): Promise<GeneralMessageResponse>
Assigns a participant to a breakout room (other than the host / co-host). Only one user assigned per call. For open breakout rooms, the method triggers a user flow to join the room.

Supported roles: Host, Co-Host

Supports Guest Mode: No

Note:

assignParticipantToBreakoutRoom cannot be executed while the current user is changing rooms.
To assign yourself (as host / co-host) to a breakout room, use method changeBreakoutRoom.
Error codes ZoomApiError

Status Code	Status Message
10075	The participant ID is error, please get the newest participant ID.
10078	Participant is not in Breakout Room.
10103	Assign user to Breakout Room failed.
10094	The id of the user is incorrect.
10093	The id of the Breakout room is incorrect.
Parameters
options: AssignParticipantToBreakoutRoomOptions
Returns Promise<GeneralMessageResponse>
```
```
getBreakoutRoomList
Desktop Client Version: 5.9.3

iOS Client Version: 5.10.6

Android Client Version: 5.14.5

getBreakoutRoomList(): Promise<BreakoutRoomsResponse>
List all breakout rooms. Host and Co-Host get list of rooms and participants for each breakout room. Participants get only list of rooms. The method works for participants only when breakout rooms are open.

Supported roles: Host, Co-Host, Participant

Supports Guest Mode: Yes

Example payload

{
  rooms: [{
    breakoutRoomId: "room uuid",
    name: "room name",
    participants: [{
      participantUUID,
      displayName,
      participantStatus = ["assigned"|"joined"]
    }, …],
    state = [“open”|”closed”],
    unassigned:  [{
      participantUUID,
      displayName
    }, …]
  }]
}
Returns an array of breakout rooms with their names, UUID, and an array of participant id's.

Error codes ZoomApiError

Status Code	Status Message
10092	Breakout Rooms are not open.
Returns Promise<BreakoutRoomsResponse>
```