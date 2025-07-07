import {Entity, Column, PrimaryGeneratedColumn, OneToMany, BaseEntity} from "typeorm"
import {JornadaDia} from "./JornadaDia";
import {Turno} from "./Turno";

@Entity()
export class Horario extends BaseEntity{
    @PrimaryGeneratedColumn()
    id: number;
    @Column()
    nombre: string
    @Column()
    tolerancia: number
    @Column()
    color: string
    @Column()
    area: string
    @Column({nullable: true})
    descripcion: string
    @Column({nullable: true})
    incluyeFeriados: boolean
    @Column({nullable: true})
    diasIntercalados: boolean
    @Column({nullable: true})
    jornadasDosDias: boolean
    @Column({nullable: true})
    esContinuoDosDias: boolean
    @Column({nullable: true})
    esTeleTrabajo: boolean
    @OneToMany(() => JornadaDia, (jornadaDia) => jornadaDia.horario)
    jornadaDias: JornadaDia[]
}